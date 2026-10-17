# frozen_string_literal: true

module Bookings
  # A booking made by staff in Connect, through the scheduler widget's own
  # steps (SchedualToursController#create_tour_user_from, less the card
  # charge and the redirect):
  #   1. the phone is normalised and the visitor found by phone and email
  #      (TourUserSearcherService), updated, or created;
  #   2. a scheduled visit must fall on an open slot of an open tour type
  #      (Bookings::Availability); an unscheduled visit has no date;
  #   3. the visitor's upcoming booking at the property, if any, is reused
  #      (MaxDateScheduledTourService: "one active booking per person"), which
  #      the widget treats as a reschedule;
  #   4. the CRM appointments are booked (Yardi RentCafe, Funnel, Knock,
  #      RealPage) and the visitor and the property are notified
  #      (SchedualTours::Notifications), exactly as for a widget booking.
  # `created_by` is "Staff" so the lists and the CSV say where it came from.
  class Create
    include SchedualTours::Notifications

    CREATED_BY = 'Staff'
    TOUR_TYPES = %w[self_tour guided_tour].freeze
    PROPERTY_TOUR_TYPES = %w[scheduled_tour unscheduled_self_tour].freeze

    Result = Struct.new(:booking, :visitor, :rescheduled, :notifications, keyword_init: true)

    def initialize(community, user: nil, request_ip: nil)
      @community = community
      @user = user
      @request_ip = request_ip
      @availability = Availability.new(community)
    end

    def self.call!(community, attrs, user: nil, request_ip: nil)
      new(community, user: user, request_ip: request_ip).call!(attrs)
    end

    def call!(attrs)
      attrs = attrs.to_h.with_indifferent_access
      gate!
      property_tour_type = attrs[:property_tour_type].presence || 'scheduled_tour'
      raise Connect::DomainError.invalid('invalid_tour', 'Pick a scheduled or an unscheduled visit.') unless PROPERTY_TOUR_TYPES.include?(property_tour_type)

      tour_type = attrs[:tour_type].presence || 'self_tour'
      raise Connect::DomainError.invalid('invalid_tour_type', 'Pick an app-guided or a person-guided tour.') unless TOUR_TYPES.include?(tour_type)
      raise Connect::DomainError.invalid('tour_type_off', "#{Availability::TYPE_LABELS[tour_type]} is turned off for this property.") unless type_allowed?(tour_type)

      date, time = slot!(attrs, tour_type, property_tour_type)
      visitor = visitor!(attrs)

      booking = nil
      rescheduled = false
      previous = {}
      ApplicationRecord.transaction do
        existing = MaxDateScheduledTourService.new(visitor, community, true).get_scheduled_tour
        if existing.present? && !existing.is_tour_completed
          booking = existing
          rescheduled = existing.tour_user_id.present?
          previous = { tour_date: existing.tour_date, tour_time: existing.tour_time, is_rescheduled: rescheduled }
        else
          booking = SchedualTour.new(community_id: community.id, user_time_zone: @availability.tz, created_by: CREATED_BY)
          last = community.schedual_tours.where(tour_user_id: visitor.id).order(:id).last
          booking.stops_list = last.stops_list if last&.stops_list.present?
        end
        booking.assign_attributes(
          tour_user_id: visitor.id, tour_type: tour_type, property_tour_type: property_tour_type,
          tour_date: date, tour_time: time, end_time: time && (time + SchedualTours::Capacity.stepping(community).minutes),
          day_diff: date && (date - @availability.now.to_date).to_i,
          desired_bedroom: attrs[:desired_bedroom].presence, desired_move_in_date: move_in_date(attrs[:desired_move_in_date]),
          user_time_zone: @availability.tz, country_code: attrs[:country_code].presence || booking.country_code,
          knock_prospect_ip_address: @request_ip, created_by: booking.created_by.presence || CREATED_BY
        )
        booking.created_by = CREATED_BY if booking.new_record?
        booking.save!
      end

      crm!(booking, previous, rescheduled, property_tour_type, attrs)
      notifications = notify(booking, previous, rescheduled, property_tour_type)
      audit(booking, rescheduled ? 'booking_rescheduled' : 'booking_created')
      Result.new(booking: booking, visitor: visitor, rescheduled: rescheduled, notifications: notifications)
    end

    private

      attr_reader :community

      def gate!
        tour = community.community_tour
        raise Connect::DomainError.invalid('tour_disabled', 'This property has no Pynwheel Tour.') unless Connect::ProductState.tour?(community) && tour&.tour_setting
        raise Connect::DomainError.invalid('salesforce', 'Bookings for this property are made in Salesforce.') if community.is_salesforce_community?
      end

      def type_allowed?(tour_type)
        setting = community.community_tour.tour_setting
        tour_type == 'self_tour' ? setting.allow_self_tour : setting.allow_guided_tour
      end

      # The date and time of a scheduled visit, checked against the widget's slots.
      def slot!(attrs, tour_type, property_tour_type)
        return [nil, nil] if property_tour_type == 'unscheduled_self_tour'

        date = begin
          Date.parse(attrs[:tour_date].to_s)
        rescue ArgumentError
          nil
        end
        raise Connect::DomainError.invalid('invalid_date', 'Pick a date.') if date.nil?
        raise Connect::DomainError.invalid('past_date', 'That date has passed.') if date < @availability.now.to_date

        hhmm = @availability.normalize(attrs[:tour_time])
        raise Connect::DomainError.invalid('invalid_time', 'Pick a time.') if hhmm.nil?

        day = @availability.day(date)
        slot = day[:slots].find { |row| row[:time] == hhmm }
        raise Connect::DomainError.invalid('slot_unavailable', 'That time is not open for booking.', { date: day[:date], slots: day[:slots] }) if slot.nil?
        raise Connect::DomainError.invalid('slot_full', "That time is full for #{Availability::TYPE_LABELS[tour_type]}.", { date: day[:date], slots: day[:slots] }) if slot[:full].include?(tour_type)
        raise Connect::DomainError.invalid('slot_unavailable', "#{Availability::TYPE_LABELS[tour_type]} is not offered at that time.", { date: day[:date], slots: day[:slots] }) unless slot[:types].include?(tour_type)

        [date, Time.zone.parse("#{date.iso8601} #{hhmm}")]
      end

      def visitor!(attrs)
        email = attrs[:email].to_s.strip.downcase
        phone = normalize_phone(attrs[:phone_number].to_s.gsub(/[^0-9+]/, ''), attrs[:country_code].presence || community.fetch_country_code)
        first = attrs[:first_name].to_s.strip
        last = attrs[:last_name].to_s.strip
        raise Connect::DomainError.invalid('invalid_visitor', 'First name, last name, email and phone are required.') if first.blank? || last.blank? || email.blank? || phone.blank?

        visitor = TourUserSearcherService.new(phone, email).find_tour_user
        visitor ||= TourUser.new(email: email, phone_number: phone)
        visitor.name = "#{first} #{last}"
        visitor.first_name = first
        visitor.last_name = last
        visitor.phone_number = phone
        visitor.email = email
        visitor.desired_bedroom = attrs[:desired_bedroom].presence
        visitor.is_sms_enabled = attrs.key?(:is_sms_enabled) ? ActiveModel::Type::Boolean.new.cast(attrs[:is_sms_enabled]) != false : true
        raise Connect::DomainError.invalid('invalid_visitor', visitor.errors.full_messages.join(', ')) unless visitor.save

        visitor
      end

      # The widget sends dd/mm/yyyy; Connect sends ISO.
      def move_in_date(value)
        return nil if value.blank?

        Date.iso8601(value.to_s)
      rescue ArgumentError
        begin
          Date.strptime(value.to_s, '%d/%m/%Y')
        rescue ArgumentError
          raise Connect::DomainError.invalid('invalid_move_in', 'The move-in date is not a date.')
        end
      end

      def crm!(booking, previous, rescheduled, property_tour_type, attrs)
        if property_tour_type == 'scheduled_tour' && community.use_yardi_as_lead?
          if community.credential&.rentcafe_api_version == 'RentCafe V2'
            YardiRentCafeV2Services::MarketingApisV2Service.new(booking).schedule_tour(previous)
          else
            YardiRentCafeServices::MarketingApisService.new(booking).schedule_tour(previous)
          end
        end
        FunnelService.new(community).funnel_crm(booking, rescheduled) if community.is_funnel_community?
        KnockService.new(community).knock_crm(booking, rescheduled) if community.is_knock_community?
        if community.data_provider == 'realpagesvc'
          appointment_time = booking.tour_date && booking.tour_time ? "#{booking.tour_date} #{booking.tour_time.strftime('%H:%M:%S')}".to_datetime : nil
          community.realpage_insert_prospect(booking.tour_user, appointment_time, attrs[:marketing_source].to_s, booking.desired_move_in_date)
        end
      rescue Connect::DomainError
        raise
      rescue StandardError => e
        # The booking stands; the CRM push is logged the way the widget logs it.
        AccessLogsService.new.scheduler_widget_logs(community.id, { booking: booking.id, source: 'connect' }, e.message) rescue nil
        Rails.logger.warn("[Bookings::Create] CRM push failed for booking #{booking.id}: #{e.class}: #{e.message}")
      end

      def notify(booking, previous, rescheduled, property_tour_type)
        sent = send_email_and_other_notifications(booking, previous, rescheduled, property_tour_type)
        { email: community.alert_contact.to_s != 'phone', sms: booking.tour_user.is_sms_enabled && community.alert_contact.to_s != 'email', web: sent[:web_notification].present? }
      rescue StandardError => e
        AccessLogsService.new.scheduler_widget_logs(community.id, { booking: booking.id, source: 'connect' }, e.message) rescue nil
        Rails.logger.warn("[Bookings::Create] notifications failed for booking #{booking.id}: #{e.class}: #{e.message}")
        { email: false, sms: false, web: false, error: true }
      end

      def audit(booking, event)
        PaperTrail::Version.create!(
          item_type: 'SchedualTour', item_id: booking.id, event: event, whodunnit: @user&.id&.to_s,
          community_id: community.id, company_id: community.company_id,
          object: { tour_user_id: booking.tour_user_id, tour_date: booking.tour_date, tour_time: booking.tour_time&.strftime('%H:%M'), tour_type: booking.tour_type, created_by: booking.created_by }.to_json
        )
      rescue StandardError => e
        Rails.logger.warn("[Bookings::Create] audit row not written: #{e.class}: #{e.message}")
      end
  end
end

# frozen_string_literal: true

module Bookings
  # Moving a booking to another slot, as the widget's reschedule does
  # (SchedualToursController#update): the new slot must be open for the
  # booking's tour type, the CRM appointments move, the reminder flags reset
  # and the "rescheduled" notifications go out with the old and new times.
  class Reschedule
    include SchedualTours::Notifications

    def initialize(community, user: nil)
      @community = community
      @user = user
      @availability = Availability.new(community)
    end

    def self.call!(community, booking, attrs, user: nil)
      new(community, user: user).call!(booking, attrs)
    end

    def call!(booking, attrs)
      attrs = attrs.to_h.with_indifferent_access
      raise Connect::DomainError.invalid('not_scheduled', 'An unscheduled visit has no time to move.') unless booking.property_tour_type == 'scheduled_tour' || booking.tour_date.present?
      raise Connect::DomainError.invalid('completed', 'This visit is already completed.') if booking.is_tour_completed
      raise Connect::DomainError.invalid('salesforce', 'Bookings for this property are moved in Salesforce.') if community.is_salesforce_community?

      date = begin
        Date.parse(attrs[:tour_date].to_s)
      rescue ArgumentError
        nil
      end
      raise Connect::DomainError.invalid('invalid_date', 'Pick a date.') if date.nil?
      raise Connect::DomainError.invalid('past_date', 'That date has passed.') if date < @availability.now.to_date

      hhmm = @availability.normalize(attrs[:tour_time])
      raise Connect::DomainError.invalid('invalid_time', 'Pick a time.') if hhmm.nil?

      tour_type = booking.tour_type.presence || 'self_tour'
      day = @availability.day(date)
      slot = day[:slots].find { |row| row[:time] == hhmm }
      raise Connect::DomainError.invalid('slot_unavailable', 'That time is not open for booking.', { date: day[:date], slots: day[:slots] }) if slot.nil?
      raise Connect::DomainError.invalid('slot_full', "That time is full for #{Availability::TYPE_LABELS[tour_type]}.", { date: day[:date], slots: day[:slots] }) if slot[:full].include?(tour_type)
      raise Connect::DomainError.invalid('slot_unavailable', "#{Availability::TYPE_LABELS[tour_type]} is not offered at that time.", { date: day[:date], slots: day[:slots] }) unless slot[:types].include?(tour_type)

      previous = { tour_date: booking.tour_date, tour_time: booking.tour_time }
      time = Time.zone.parse("#{date.iso8601} #{hhmm}")
      day_diff = (date - @availability.now.to_date).to_i

      crm!(booking, previous)
      booking.update!(tour_date: date, tour_time: time, end_time: time + SchedualTours::Capacity.stepping(community).minutes, day_diff: day_diff,
                      property_tour_type: 'scheduled_tour', hourly_email_sent: false, daily_email_sent: day_diff >= 1)
      notifications = notify(booking, previous)
      audit(booking, previous)
      { booking: booking, previous: previous, notifications: notifications }
    end

    private

      attr_reader :community

      def crm!(booking, previous)
        if community.use_yardi_as_lead?
          if community.credential&.rentcafe_api_version == 'RentCafe V2'
            YardiRentCafeV2Services::MarketingApisV2Service.new(booking).schedule_tour(previous)
          else
            YardiRentCafeServices::MarketingApisService.new(booking).schedule_tour(previous)
          end
        end
        FunnelService.new(community).funnel_crm(booking, true) if community.is_funnel_community?
        KnockService.new(community).knock_crm(booking, true) if community.is_knock_community?
      rescue StandardError => e
        AccessLogsService.new.scheduler_widget_logs(community.id, { booking: booking.id, source: 'connect-reschedule' }, e.message) rescue nil
        Rails.logger.warn("[Bookings::Reschedule] CRM push failed for booking #{booking.id}: #{e.class}: #{e.message}")
      end

      def notify(booking, previous)
        sent = send_email_and_other_notifications(booking, previous, true, 'scheduled_tour')
        { email: community.alert_contact.to_s != 'phone', sms: booking.tour_user.is_sms_enabled && community.alert_contact.to_s != 'email', web: sent[:web_notification].present? }
      rescue StandardError => e
        Rails.logger.warn("[Bookings::Reschedule] notifications failed for booking #{booking.id}: #{e.class}: #{e.message}")
        { email: false, sms: false, web: false, error: true }
      end

      def audit(booking, previous)
        PaperTrail::Version.create!(
          item_type: 'SchedualTour', item_id: booking.id, event: 'booking_rescheduled', whodunnit: @user&.id&.to_s,
          community_id: community.id, company_id: community.company_id,
          object: { from: { tour_date: previous[:tour_date], tour_time: previous[:tour_time]&.strftime('%H:%M') }, to: { tour_date: booking.tour_date, tour_time: booking.tour_time&.strftime('%H:%M') } }.to_json
        )
      rescue StandardError => e
        Rails.logger.warn("[Bookings::Reschedule] audit row not written: #{e.class}: #{e.message}")
      end
  end
end

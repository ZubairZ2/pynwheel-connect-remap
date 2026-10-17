# frozen_string_literal: true

module Scheduling
  # The booking settings of a property as the legacy Tour Settings page
  # stores them (tours/settings.html.haml → CommunitiesController#save_tour_settings,
  # ToursController#save_opening_hours / #save_guided_opening_hours,
  # ToursController#save_schedule_widget_btn_setting), read and written on
  # the same columns:
  #   tour types            tour_settings.allow_self_tour / allow_guided_tour / allow_virtual_tour
  #   slot interval         tour_settings.time_intervel ("15 min", "30 min", "1 hr", "2 hrs")
  #   capacity              tour_settings.do_limit_max_tour, limit_max_tour; tours.max_self/guided/virtual_tour_users
  #   booking behaviour     tours.only_scheduled_tour, grace_period (10–60), tour_settings.length_stay_limit
  #   scheduler on/off      communities.scheduler_widget
  #   visiting hours        opening_hours (self-guided) and guided_opening_hours, one row per range per weekday
  #   booking form          tours.credit_card_required, marketing_source_required, visual_id_verification;
  #                         tour_settings.show_desired_bedroom, show_desired_move_in_date, charge_user_for_id_verfication
  #   booking button        scheduler_widget_settings
  #   booking link          Community#schedule_tour_url (HOST_URL + the signed property code)
  # Nothing here invents a rule: a setting the schema does not hold (lead
  # time, booking horizon, buffers, holidays) is reported as unavailable.
  class Settings
    DAYS = %w[Monday Tuesday Wednesday Thursday Friday Saturday Sunday].freeze
    INTERVALS = SchedualTours::Capacity::INTERVALS
    HHMM = /\A([01]\d|2[0-3]):[0-5]\d\z/
    GRACE = (10..60)

    def initialize(community)
      @community = community
      @availability = Bookings::Availability.new(community)
    end

    def tour
      @tour ||= community.community_tour
    end

    def setting
      @setting ||= tour&.tour_setting
    end

    def button
      @button ||= tour&.scheduler_widget_setting
    end

    def as_json(*)
      {
        configured: tour.present? && setting.present?,
        gates: gates,
        widget_live: widget_live?,
        salesforce: community.is_salesforce_community? == true,
        crm: crm,
        scheduler_enabled: community.scheduler_widget != false,
        tour_types: setting ? { self_tour: setting.allow_self_tour == true, guided_tour: setting.allow_guided_tour == true, virtual_tour: setting.allow_virtual_tour == true } : nil,
        slot_interval: setting&.time_intervel,
        slot_interval_minutes: SchedualTours::Capacity.interval_minutes(community),
        capacity: setting && tour ? { enabled: setting.do_limit_max_tour == true, limit_max_tour: setting.limit_max_tour, max_self_tour_users: tour.max_self_tour_users, max_guided_tour_users: tour.max_guided_tour_users, max_virtual_tour_users: tour.max_virtual_tour_users } : nil,
        only_scheduled_tour: tour&.only_scheduled_tour == true,
        grace_period: tour&.grace_period,
        length_stay_limit: setting&.length_stay_limit,
        time_zone: community.time_zone,
        time_zone_effective: community.get_time_zone,
        hours: { self: hours_of(community.opening_hours), guided: hours_of(community.guided_opening_hours) },
        unavailable: %w[minimum_notice booking_horizon buffer holidays],
        form: form,
        button: button_json,
        link: link
      }
    end

    # The widget's own preconditions (SchedulerWidget::WidgetsController#can_user_schedule_tour).
    def gates
      [
        { key: 'property_active', label: 'The property is active', ok: community.locked != true, error: 'Property is Inactive' },
        { key: 'tour_on', label: 'Pynwheel Tour is on', ok: Connect::ProductState.tour?(community), error: 'Pynwheel Tour is Disabled' },
        { key: 'scheduler_on', label: 'The scheduler is on', ok: community.scheduler_widget != false, error: 'Scheduler is Disabled' },
        { key: 'tour_type_on', label: 'At least one tour type is on', ok: setting.present? && (setting.allow_self_tour || setting.allow_guided_tour) == true, error: 'No Tour Type is Active' }
      ]
    end

    def widget_live?
      !community.is_salesforce_community? && gates.all? { |g| g[:ok] }
    end

    def crm
      {
        provider: community.crm_credential&.crm_provider.presence,
        lead_sync: community.credential&.use_different_crm_provider == true,
        managed_hours: @availability.managed_by,
        data_provider: community.data_provider.presence
      }
    end

    def form
      return nil unless tour && setting

      {
        credit_card_required: tour.credit_card_required == true,
        id_verification_fee: setting.charge_user_for_id_verfication == true,
        visual_id_verification: tour.visual_id_verification == true,
        show_desired_bedroom: setting.show_desired_bedroom == true,
        show_desired_move_in_date: setting.show_desired_move_in_date == true,
        marketing_source_required: tour.marketing_source_required == true,
        marketing_source_available: community.data_provider == 'realpagesvc',
        discovery_source: discovery_source,
        sms_opt_in_default: true,
        fixed_fields: %w[property_tour_type tour_date tour_time tour_type first_name last_name country_code phone_number email is_sms_enabled]
      }
    end

    def discovery_source
      return 'knock' if community.is_knock_community?
      return 'funnel' if community.is_funnel_community?
      return 'rentcafe' if community.use_yardi_as_lead?

      nil
    end

    def button_json
      return nil unless button

      { text: button.btn_text, color: button.btn_color, width: button.btn_width, height: button.btn_height, font: button.btn_font, font_size: button.btn_font_size }
    end

    def link
      host = ENV['HOST_URL'].to_s.presence
      url = host ? community.schedule_tour_url : nil
      {
        url: url,
        host_configured: host.present?,
        live: widget_live? && url.present?,
        reasons: gates.reject { |g| g[:ok] }.map { |g| g[:error] } + (community.is_salesforce_community? ? ['Bookings via Salesforce'] : []),
        embed_html: url && button ? embed_html(url) : nil
      }
    end

    def embed_html(url)
      b = button
      %(<a href="#{url}" target="_blank" style="display:inline-flex;align-items:center;justify-content:center;width:#{b.btn_width}px;height:#{b.btn_height}px;background:#{b.btn_color};color:#fff;font:#{b.btn_font_size} '#{b.btn_font}',sans-serif;border-radius:4px;text-decoration:none;">#{ERB::Util.html_escape(b.btn_text)}</a>)
    end

    # {"Monday" => [{id, open: "09:00", close: "17:00"}], ...} in 24-hour time, every weekday present.
    def hours_of(scope)
      rows = scope.order(:sort, :id).to_a
      DAYS.index_with do |day|
        rows.select { |row| row.day == day }.filter_map do |row|
          open = to_hhmm(row.opening_time)
          close = to_hhmm(row.closing_time)
          next nil if open.nil? || close.nil?

          { id: row.id, open: open, close: close }
        end
      end
    end

    def to_hhmm(value)
      return nil if value.blank?
      return value if HHMM.match?(value)

      Time.zone.parse(value).strftime('%H:%M')
    rescue ArgumentError
      nil
    end

    # ── writes ────────────────────────────────────────────────────────

    def update_rules!(attrs, user: nil)
      attrs = attrs.to_h.with_indifferent_access
      raise Connect::DomainError.invalid('tour_disabled', 'This property has no Pynwheel Tour.') unless tour && setting

      errors = []
      setting_changes = {}
      tour_changes = {}
      community_changes = {}
      %w[allow_self_tour allow_guided_tour allow_virtual_tour do_limit_max_tour].each do |key|
        setting_changes[key.to_sym] = truthy?(attrs[key]) if attrs.key?(key)
      end
      if attrs.key?(:slot_interval_minutes)
        label = INTERVALS.key(attrs[:slot_interval_minutes].to_i)
        label ? setting_changes[:time_intervel] = label : errors << { path: 'slot_interval_minutes', code: 'invalid', message: 'the interval is 15, 30, 60 or 120 minutes' }
      end
      if attrs.key?(:limit_max_tour)
        value = integer(attrs[:limit_max_tour])
        value && value >= 1 ? setting_changes[:limit_max_tour] = value : errors << { path: 'limit_max_tour', code: 'invalid', message: 'must be a whole number of at least 1' }
      end
      if attrs.key?(:length_stay_limit)
        value = integer(attrs[:length_stay_limit])
        value && value >= 1 && value <= 600 ? setting_changes[:length_stay_limit] = value : errors << { path: 'length_stay_limit', code: 'invalid', message: 'must be a whole number of minutes from 1 to 600' }
      end
      %w[max_self_tour_users max_guided_tour_users max_virtual_tour_users].each do |key|
        next unless attrs.key?(key)

        if attrs[key].blank?
          tour_changes[key.to_sym] = nil
        else
          value = integer(attrs[key])
          value && value >= 1 ? tour_changes[key.to_sym] = value : errors << { path: key, code: 'invalid', message: 'must be a whole number of at least 1, or empty' }
        end
      end
      tour_changes[:only_scheduled_tour] = truthy?(attrs[:only_scheduled_tour]) if attrs.key?(:only_scheduled_tour)
      if attrs.key?(:grace_period)
        value = integer(attrs[:grace_period])
        value && GRACE.cover?(value) ? tour_changes[:grace_period] = value : errors << { path: 'grace_period', code: 'invalid', message: 'the grace period is 10 to 60 minutes' }
      end
      community_changes[:scheduler_widget] = truthy?(attrs[:scheduler_enabled]) if attrs.key?(:scheduler_enabled)
      raise Wayfinding::Invalid.new(errors) if errors.any?
      raise Connect::DomainError.invalid('nothing_to_save', 'Nothing to save.') if setting_changes.empty? && tour_changes.empty? && community_changes.empty?

      ApplicationRecord.transaction do
        setting.update_columns(setting_changes.merge(updated_at: Time.current)) if setting_changes.any?
        tour.update_columns(tour_changes.merge(updated_at: Time.current)) if tour_changes.any?
        community.update_columns(community_changes) if community_changes.any?
        audit(user, 'booking_rules_save', setting: setting_changes.keys, tour: tour_changes.keys, community: community_changes.keys)
      end
      reset!
      as_json
    end

    # `hours`: {self: {"Monday" => [{open, close}]}, guided: {...}}; a lane left out is unchanged.
    def update_hours!(hours, user: nil)
      hours = hours.to_h.with_indifferent_access
      errors = []
      lanes = {}
      { self: OpeningHour, guided: GuidedOpeningHour }.each do |lane, klass|
        next unless hours.key?(lane)

        parsed = {}
        DAYS.each do |day|
          ranges = Array(hours[lane][day]).map { |r| r.to_h.with_indifferent_access }
          rows = ranges.each_with_index.filter_map do |range, index|
            open = range[:open].to_s
            close = range[:close].to_s
            path = "#{lane}.#{day}[#{index}]"
            next errors << { path: path, code: 'invalid', message: 'times are HH:MM' } unless HHMM.match?(open) && HHMM.match?(close)
            next errors << { path: path, code: 'invalid', message: 'the closing time must be after the opening time' } unless open < close

            [open, close]
          end
          rows.sort!
          rows.each_cons(2) { |a, b| errors << { path: "#{lane}.#{day}", code: 'overlap', message: 'ranges overlap' } if b[0] < a[1] }
          parsed[day] = rows
        end
        lanes[lane] = [klass, parsed]
      end
      raise Wayfinding::Invalid.new(errors) if errors.any?
      raise Connect::DomainError.invalid('nothing_to_save', 'Nothing to save.') if lanes.empty?

      ApplicationRecord.transaction do
        lanes.each_value do |klass, parsed|
          # The legacy form replaces the lane's rows (ToursController#save_opening_hours).
          klass.where(community_id: community.id).delete_all
          sort = 0
          DAYS.each do |day|
            parsed[day].each do |open, close|
              sort += 1
              klass.create!(community_id: community.id, day: day, opening_time: open, closing_time: close, sort: sort)
            end
          end
        end
        audit(user, 'visiting_hours_save', lanes: lanes.keys)
      end
      reset!
      as_json
    end

    def update_form!(attrs, user: nil)
      attrs = attrs.to_h.with_indifferent_access
      raise Connect::DomainError.invalid('tour_disabled', 'This property has no Pynwheel Tour.') unless tour && setting

      errors = []
      setting_changes = {}
      tour_changes = {}
      button_changes = {}
      setting_changes[:show_desired_bedroom] = truthy?(attrs[:show_desired_bedroom]) if attrs.key?(:show_desired_bedroom)
      setting_changes[:show_desired_move_in_date] = truthy?(attrs[:show_desired_move_in_date]) if attrs.key?(:show_desired_move_in_date)
      setting_changes[:charge_user_for_id_verfication] = truthy?(attrs[:id_verification_fee]) if attrs.key?(:id_verification_fee)
      tour_changes[:credit_card_required] = truthy?(attrs[:credit_card_required]) if attrs.key?(:credit_card_required)
      tour_changes[:visual_id_verification] = truthy?(attrs[:visual_id_verification]) if attrs.key?(:visual_id_verification)
      if attrs.key?(:marketing_source_required)
        if community.data_provider == 'realpagesvc' || !truthy?(attrs[:marketing_source_required])
          tour_changes[:marketing_source_required] = truthy?(attrs[:marketing_source_required])
        else
          errors << { path: 'marketing_source_required', code: 'invalid', message: 'only RealPage properties can require a marketing source' }
        end
      end
      if attrs.key?(:button)
        b = attrs[:button].to_h.with_indifferent_access
        if b.key?(:text)
          text = b[:text].to_s.strip
          text.present? && text.length <= 50 ? button_changes[:btn_text] = text : errors << { path: 'button.text', code: 'invalid', message: 'the button text is 1 to 50 characters' }
        end
        if b.key?(:color)
          color = b[:color].to_s.strip
          /\A#[0-9a-fA-F]{6}\z/.match?(color) ? button_changes[:btn_color] = color.downcase : errors << { path: 'button.color', code: 'invalid', message: 'the colour is a #rrggbb value' }
        end
        { width: :btn_width, height: :btn_height }.each do |key, column|
          next unless b.key?(key)

          value = integer(b[key])
          value && value >= 10 && value <= 1000 ? button_changes[column] = value : errors << { path: "button.#{key}", code: 'invalid', message: 'must be 10 to 1000 pixels' }
        end
        if b.key?(:font)
          font = b[:font].to_s.strip
          font.present? && font.length <= 60 ? button_changes[:btn_font] = font : errors << { path: 'button.font', code: 'invalid', message: 'name the font' }
        end
        if b.key?(:font_size)
          size = b[:font_size].to_s.strip
          /\A\d{1,2}px\z/.match?(size) ? button_changes[:btn_font_size] = size : errors << { path: 'button.font_size', code: 'invalid', message: 'the font size is a px value' }
        end
      end
      raise Wayfinding::Invalid.new(errors) if errors.any?
      raise Connect::DomainError.invalid('nothing_to_save', 'Nothing to save.') if setting_changes.empty? && tour_changes.empty? && button_changes.empty?

      ApplicationRecord.transaction do
        setting.update_columns(setting_changes.merge(updated_at: Time.current)) if setting_changes.any?
        tour.update_columns(tour_changes.merge(updated_at: Time.current)) if tour_changes.any?
        if button_changes.any?
          (button || tour.create_scheduler_widget_setting).update_columns(button_changes.merge(updated_at: Time.current))
        end
        audit(user, 'booking_form_save', setting: setting_changes.keys, tour: tour_changes.keys, button: button_changes.keys)
      end
      reset!
      as_json
    end

    private

      attr_reader :community

      def truthy?(value)
        ActiveModel::Type::Boolean.new.cast(value) == true
      end

      def integer(value)
        Integer(value.to_s, 10)
      rescue ArgumentError, TypeError
        nil
      end

      def reset!
        @tour = nil
        @setting = nil
        @button = nil
        community.reload
        @availability = Bookings::Availability.new(community)
      end

      def audit(user, event, payload)
        PaperTrail::Version.create!(
          item_type: 'Community', item_id: community.id, event: event, whodunnit: user&.id&.to_s,
          community_id: community.id, company_id: community.company_id, object: payload.to_json
        )
      rescue StandardError => e
        Rails.logger.warn("[Scheduling::Settings] audit row not written: #{e.class}: #{e.message}")
      end
  end
end

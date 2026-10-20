# frozen_string_literal: true

module Visitors
  # Cancelled bookings. The legacy CMS deletes a cancelled booking
  # (SchedualToursController#destroy), so the only trace is the PaperTrail
  # version of the destroy; it is read back here, never recreated.
  module Cancelled
    # A reified SchedualTour with `cancelled?` and the time it was cancelled.
    module Marker
      attr_accessor :cancelled_at, :cancelled_by

      def cancelled?
        true
      end
    end

    module_function

    # `tour_user_id:` narrows the versions to one visitor's (the profile and
    # the per-visitor checks read a handful of documents, not the property's
    # last 500).
    def for(community, limit: 500, tour_user_id: nil)
      scope = PaperTrail::Version.where(item_type: 'SchedualTour', event: 'destroy')
                                 .where("community_id = ? OR object LIKE ?", community.id, "%\ncommunity_id: #{community.id}\n%")
      scope = scope.where("object LIKE ?", "%\ntour_user_id: #{tour_user_id.to_i}\n%") if tour_user_id.present?
      scope = scope.order(id: :desc).limit(limit)
      scope.filter_map do |version|
        booking = read(version)
        next nil unless booking && booking.community_id == community.id && booking.tour_user_id.present?

        booking.extend(Marker)
        booking.cancelled_at = version.created_at
        booking.cancelled_by = version.whodunnit
        booking
      rescue StandardError => e
        Rails.logger.warn("[Visitors::Cancelled] version #{version.id} could not be read: #{e.class}: #{e.message}")
        nil
      end
    end

    # The `time` column is stored as ActiveRecord::Type::Time::Value (a Time subclass).
    PERMITTED = [Date, Time, DateTime, ActiveSupport::TimeWithZone, ActiveSupport::TimeZone, ActiveRecord::Type::Time::Value, Symbol, BigDecimal].freeze

    # The destroyed row's attributes. PaperTrail stores them as YAML with
    # Date and Time values, which `Version#reify` refuses under Psych 4
    # (Psych::DisallowedClass), so the document is read here with those
    # classes allowed and the row rebuilt in memory; it is never saved.
    def read(version)
      raw = version.object.to_s
      return nil if raw.blank?

      attributes = YAML.safe_load(raw, permitted_classes: PERMITTED, aliases: true)
      return nil unless attributes.is_a?(Hash)

      known = attributes.slice(*SchedualTour.column_names)
      booking = SchedualTour.new
      known.each { |column, value| booking[column] = plain_time(value) }
      booking
    end

    # PaperTrail writes the `time` column as a serialized
    # ActiveRecord::Type::Time::Value; the object YAML rebuilds casts to nil
    # on assignment (the booked time of every cancelled booking read as
    # "unscheduled" until October 21, 2026). Its UTC instant is a plain Time
    # the column accepts.
    def plain_time(value)
      return value unless value.is_a?(ActiveSupport::TimeWithZone) || value.class.name == 'ActiveRecord::Type::Time::Value'

      utc = value.instance_variable_get(:@utc) || value.instance_variable_get(:@time)
      utc.respond_to?(:to_time) ? utc.to_time : value
    rescue StandardError
      value
    end
  end
end

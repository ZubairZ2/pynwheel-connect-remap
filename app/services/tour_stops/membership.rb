# frozen_string_literal: true

module TourStops
  # "Show in Stops List" for a unit or an amenity: whether the record is a
  # stop of the property's Self-Guided Tour. The relationship is the one the
  # legacy Tour Setup creates (`ToursController#ajaxplottourstoppoint`): one
  # `tour_stops` row of the main tour per record, and for an amenity also the
  # amenity form's own "Show in Stops List" column (`breezway_lock_visible`),
  # which the mobile tour reads (`CommunityTour`).
  #
  #   ON   find-or-create the main tour's stop (never a second one), make it
  #        visible, and for an amenity set the column true
  #   OFF  remove the stop the way TourStopsController#destroy does
  #        (`TourStops::Remove`), and for an amenity set the column false
  #
  # Nothing else on the unit or amenity is touched; the column write is an
  # `update_column` so no other callback runs. Idempotent in both directions,
  # and serialised per tour by a row lock.
  module Membership
    module_function

    STOP_TYPES = %w[unit amenity].freeze

    State = Struct.new(:tour_stop, :in_stops_list, :show_in_stops, :changed, keyword_init: true)

    def set!(community:, user:, stop_type:, stop_id:, show:)
      stop_type = stop_type.to_s
      raise Wayfinding::Invalid.one('stop_type', 'invalid', 'stop_type must be unit or amenity') unless STOP_TYPES.include?(stop_type)
      raise Wayfinding::Invalid.one('community', 'tour_disabled', 'this property has no Self-Guided Tour') unless Connect::ProductState.tour?(community)

      record = (stop_type == 'unit' ? community.units : community.amenities).find_by(id: stop_id)
      raise Wayfinding::NotFound, "#{stop_type} #{stop_id} is not in this property" unless record

      state = nil
      tour = nil
      # The per-row callbacks are paused inside; the tour's version moves once
      # below, and only when something changed.
      Wayfinding::VersionBump.suspend do
        ApplicationRecord.transaction do
          tour = Tour.lock.find((community.community_tour || community.create_tour).id)
          existing = TourStop.where(tour_id: tour.id, stop_type: stop_type, stop_id: record.id).order(:id).to_a
          state = show ? turn_on(tour, record, stop_type, existing) : turn_off(record, stop_type, existing)
          write_audit(community, user, record, stop_type, show) if state.changed
        end
      end
      Wayfinding::VersionBump.tour!(tour.id) if state.changed
      state
    end

    def state_for(community, record)
      tour = community.community_tour
      stop_type = record.class.base_class.name.underscore
      stop = tour && TourStop.where(tour_id: tour.id, stop_type: stop_type, stop_id: record.id).order(:id).first
      State.new(tour_stop: stop, in_stops_list: in_list?(stop, record), show_in_stops: show_flag(record), changed: false)
    end

    def turn_on(tour, record, stop_type, existing)
      changed = false
      stop = existing.first
      if stop.nil?
        stop = TourStop.create!(
          tour_id: tour.id, stop_type: stop_type, stop_id: record.id,
          latitude: record.x_plot, longitude: record.y_plot,
          name: stop_type == 'unit' ? record.marketing_name : record.name,
          display_stop: true, sort: (TourStop.where(tour_id: tour.id).maximum(:sort) || 0) + 1
        )
        changed = true
      elsif stop.display_stop == false
        stop.update!(display_stop: true)
        changed = true
      end
      existing.drop(1).each do |duplicate|
        Remove.call!(duplicate)
        changed = true
      end
      if stop_type == 'amenity' && record.breezway_lock_visible == false
        record.update_column(:breezway_lock_visible, true)
        changed = true
      end
      State.new(tour_stop: stop, in_stops_list: true, show_in_stops: show_flag(record), changed: changed)
    end

    def turn_off(record, stop_type, existing)
      changed = false
      existing.each do |stop|
        Remove.call!(stop)
        changed = true
      end
      if stop_type == 'amenity' && record.breezway_lock_visible != false
        record.update_column(:breezway_lock_visible, false)
        changed = true
      end
      State.new(tour_stop: nil, in_stops_list: false, show_in_stops: show_flag(record), changed: changed)
    end

    def in_list?(stop, record)
      return false if stop.nil? || stop.display_stop == false

      record.is_a?(Amenity) ? record.breezway_lock_visible != false : true
    end

    def show_flag(record)
      record.is_a?(Amenity) ? record.breezway_lock_visible != false : true
    end

    def write_audit(community, user, record, stop_type, show)
      PaperTrail::Version.create!(
        item_type: record.class.base_class.name, item_id: record.id, event: show ? 'stop_list_add' : 'stop_list_remove',
        whodunnit: user&.id&.to_s, community_id: community.id, company_id: community.company_id,
        object: { stop_type: stop_type, stop_id: record.id, show: show }.to_json
      )
    rescue StandardError => e
      Rails.logger.warn("[TourStops::Membership] audit row not written: #{e.class}: #{e.message}")
    end
  end
end

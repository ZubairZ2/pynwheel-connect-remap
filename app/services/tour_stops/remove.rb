# frozen_string_literal: true

module TourStops
  # Removing a `tour_stops` row the way TourStopsController#destroy does, as
  # a service the Connect saves and the model hooks share: the stop's legacy
  # hand-drawn paths and their points, its `VisitedStop`s, then the row (whose
  # `before_destroy` takes it out of every scheduled tour's `stops_list`).
  #
  # Two deliberate differences from the controller action:
  #   - the path lookup is filtered by the stop's record type (the action's
  #     `Path.where(map_path_from_id:)` also deleted paths of other record
  #     types that happen to share the id);
  #   - the Elevator / BuildingStartingPoint record behind the stop is not
  #     destroyed unless `destroy_record:` says so. Deleting the physical
  #     record is its own, explicit action in Connect, and `Elevator` /
  #     `BuildingStartingPoint#before_destroy` then remove their stops in
  #     every tour through `for_record!`.
  module Remove
    module_function

    def call!(tour_stop, destroy_record: false)
      record = record_of(tour_stop)
      remove_legacy_paths(tour_stop, record)
      VisitedStop.where(tour_stop_id: tour_stop.id).destroy_all
      tour_stop.destroy!
      if destroy_record && record.is_a?(Elevator) || destroy_record && record.is_a?(BuildingStartingPoint)
        record.destroy!
      end
      true
    end

    # Every tour's stops for one physical record (an Elevator, a
    # BuildingStartingPoint, a WayfindingStop), filtered by type: the legacy
    # `TourStop.find_by(stop_id:)` lookups were not, and a unit and an
    # elevator can share an id.
    def for_record!(record)
      TourStop.where(stop_type: stop_type_of(record), stop_id: record.id).find_each do |tour_stop|
        call!(tour_stop)
      end
    rescue StandardError => e
      Rails.logger.warn("[TourStops::Remove] #{record.class.name} #{record.id}: #{e.class}: #{e.message}")
      raise if e.is_a?(ActiveRecord::RecordNotDestroyed)
    end

    def stop_type_of(record)
      record.class.base_class.name.underscore
    end

    def record_of(tour_stop)
      klass = tour_stop.stop_type.to_s.classify.safe_constantize
      return nil unless klass.respond_to?(:find_by)

      klass.find_by(id: tour_stop.stop_id)
    rescue StandardError
      nil
    end

    def remove_legacy_paths(tour_stop, record)
      return if record.nil?

      type = record.class.base_class.name
      Path.where(map_path_from_type: type, map_path_from_id: tour_stop.stop_id).find_each do |path|
        path.path_points.destroy_all
        path.destroy
      end
      last = record.respond_to?(:paths) ? record.paths.last : nil
      return if last.nil?

      last.path_points.destroy_all
      last.destroy
    rescue StandardError => e
      Rails.logger.warn("[TourStops::Remove] path cleanup for tour stop #{tour_stop.id}: #{e.class}: #{e.message}")
    end
  end
end

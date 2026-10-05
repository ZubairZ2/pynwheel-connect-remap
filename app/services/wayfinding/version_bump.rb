# frozen_string_literal: true

module Wayfinding
  # Moves the per-level `wayfinding_version` (floorplates / sitemaps) and the
  # per-tour `tour_setup_version` counters that Connect's saves compare-and-
  # swap on. Called from `after_commit` callbacks on every record a legacy
  # editor can change, so a Connect save started before that change is
  # refused with the current graph instead of overwriting it.
  #
  # Plain `update_all`s: no callbacks, no validations, never raises into the
  # caller (a failed bump must not fail a legacy save).
  module VersionBump
    module_function

    LEVEL_TABLES = { 'Floorplate' => Floorplate, 'Sitemap' => Sitemap }.freeze
    SUSPEND_KEY = :wayfinding_version_bump_suspended

    # A Connect save touches many rows in one transaction and moves the
    # version itself, once; the per-record callbacks are paused meanwhile.
    def suspend
      previous = Thread.current[SUSPEND_KEY]
      Thread.current[SUSPEND_KEY] = true
      yield
    ensure
      Thread.current[SUSPEND_KEY] = previous
    end

    def suspended?
      Thread.current[SUSPEND_KEY] == true
    end

    def level!(parent_type, parent_id)
      return if suspended?

      klass = LEVEL_TABLES[parent_type.to_s]
      return if klass.nil? || parent_id.blank?

      klass.where(id: parent_id).update_all('wayfinding_version = wayfinding_version + 1')
    rescue StandardError => e
      warn_failure("level #{parent_type}:#{parent_id}", e)
    end

    def community_levels!(community_id)
      return if suspended? || community_id.blank?

      Floorplate.where(community_id: community_id).update_all('wayfinding_version = wayfinding_version + 1')
      Sitemap.where(community_id: community_id).update_all('wayfinding_version = wayfinding_version + 1')
    rescue StandardError => e
      warn_failure("community #{community_id}", e)
    end

    def tour!(tour_id)
      return if suspended? || tour_id.blank?

      Tour.where(id: tour_id).update_all('tour_setup_version = tour_setup_version + 1')
    rescue StandardError => e
      warn_failure("tour #{tour_id}", e)
    end

    def warn_failure(what, error)
      Rails.logger.warn("[Wayfinding] version bump skipped for #{what}: #{error.class}: #{error.message}")
    end
    private_class_method :warn_failure
  end
end

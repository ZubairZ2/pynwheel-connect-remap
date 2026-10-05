# frozen_string_literal: true

module Wayfinding
  # The client's `base_version` is behind the stored one: someone (a legacy
  # editor or another Connect session) changed the level since it was loaded.
  class StaleVersion < Error
    attr_reader :base_version, :current_version, :changed_by, :changed_at

    def initialize(base_version:, current_version:, changed_by: nil, changed_at: nil)
      @base_version = base_version
      @current_version = current_version
      @changed_by = changed_by
      @changed_at = changed_at
      super("stale version: client #{base_version}, stored #{current_version}")
    end
  end
end

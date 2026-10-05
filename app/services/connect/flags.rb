# frozen_string_literal: true

module Connect
  # The kill switch for the Connect write endpoints (`save_graph`,
  # `save_setup`, `stop_list`). `PYN_CONNECT_WRITES=on|off` turns them on or
  # off (off answers 404 `{code: 'disabled'}`); `PYN_CONNECT_WRITES_COMMUNITY_IDS`
  # (a comma list) restricts them to an allowlist of properties while they are
  # rolled out. Production defaults to off; development and test to on.
  module Flags
    module_function

    def writes_enabled?(community = nil)
      return false unless writes_mode == 'on'

      ids = allowlist
      ids.empty? || community.nil? || ids.include?(community.id)
    end

    def writes_mode
      ENV.fetch('PYN_CONNECT_WRITES') { Rails.env.production? ? 'off' : 'on' }.to_s.strip.downcase
    end

    def allowlist
      ENV['PYN_CONNECT_WRITES_COMMUNITY_IDS'].to_s.split(/[\s,]+/).map(&:to_i).reject(&:zero?)
    end
  end
end

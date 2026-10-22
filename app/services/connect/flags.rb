# frozen_string_literal: true

module Connect
  # The kill switches of the newer write paths.
  #
  # `PYN_CONNECT_WRITES=on|off` turns the Connect write endpoints (`save_graph`,
  # `save_setup`, `stop_list`, the Visitors writes) on or off (off answers 404
  # `{code: 'disabled'}`); `PYN_CONNECT_WRITES_COMMUNITY_IDS` (a comma list)
  # restricts them to an allowlist of properties while they are rolled out.
  #
  # `PYN_TOUR_VISITS=on|off` turns the Tour App's visit recording on or off
  # (`/api/tour/v1/properties/:id/visits*`), and `PYN_TOUR_VISITOR_AUTH=on|off`
  # the visitor (prospect) sign-in of the Tour App (`/api/tour/v1/visitor/*`
  # and the acceptance of visitor session tokens). The app reads both as
  # `capabilities` and hides what the server does not offer (October 23, 2026).
  #
  # Production defaults every switch to off; development and test to on.
  module Flags
    module_function

    def writes_enabled?(community = nil)
      return false unless writes_mode == 'on'

      ids = allowlist
      ids.empty? || community.nil? || ids.include?(community.id)
    end

    def writes_mode
      mode('PYN_CONNECT_WRITES')
    end

    def allowlist
      ENV['PYN_CONNECT_WRITES_COMMUNITY_IDS'].to_s.split(/[\s,]+/).map(&:to_i).reject(&:zero?)
    end

    def tour_visits_enabled?
      mode('PYN_TOUR_VISITS') == 'on'
    end

    def tour_visitor_auth_enabled?
      mode('PYN_TOUR_VISITOR_AUTH') == 'on'
    end

    # What the Tour App may rely on from this server.
    def tour_capabilities
      { visits: tour_visits_enabled?, visitor_auth: tour_visitor_auth_enabled? }
    end

    def mode(name)
      ENV.fetch(name) { Rails.env.production? ? 'off' : 'on' }.to_s.strip.downcase
    end
  end
end

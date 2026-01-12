# frozen_string_literal: true

require_relative 'base_service'

module DataProviders
  module Beans
    class TestConnectionService < BaseService
      def initialize(community_id)
        super # sets @community in BaseService
      end

      def perform
        return false unless valid_community?

        response = fetch_api(beans_api_url)
        listings = response.dig("pageProps", "component", "listing", "available_units")

        if listings.is_a?(Array)
          listings
        else
          []
        end
      rescue StandardError
        false
      end
    end
  end
end
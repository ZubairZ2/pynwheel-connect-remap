# frozen_string_literal: true

require 'net/http'
require 'json'
require 'cgi'

module DataProviders
  module Beans
    class BaseService
      PROVIDER = 'beans'

      attr_reader :community

      def initialize(community_id)
        @community = Community.find_by(id: community_id)
      end

      private

      def valid_community?
        return false unless community.present?
        return false unless community.data_provider == PROVIDER
        true
      end

      def fetch_api(url)
        uri = URI(url)
        response = Net::HTTP.get_response(uri)

        raise "Beans API failed: #{response.code}" unless response.is_a?(Net::HTTPSuccess)

        JSON.parse(response.body)
      rescue JSON::ParserError, StandardError => e
        raise e
      end

      def beans_api_url
        raise 'ApartmentList URL missing' if community.website.blank?

        "https://www.beans.ai/client/pynwheel/apartmentlist?url=#{CGI.escape(community.website)}"
      end

      def parse_date(value)
        Date.parse(value) rescue nil
      end
    end
  end
end
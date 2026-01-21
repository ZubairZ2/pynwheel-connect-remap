# frozen_string_literal: true

require_relative 'base_service'

module DataProviders
  module Beans
    class DataImportService < BaseService
      BATCH_SIZE = 100

      def initialize(community_id)
        super # sets @community in BaseService
      end

      def perform
        return unless valid_community?

        response = fetch_api(beans_api_url)
        listings = extract_listings(response)
        return unless listings.is_a?(Array)

        ActiveRecord::Base.transaction do
          import_floorplans(listings)
          import_units(listings)
        end
      rescue StandardError => e
        raise e
      end

      private

      def extract_listings(response)
        response.dig("pageProps", "component", "listing", "available_units") || []
      end

      # ------------------------------
      # Floorplans
      # ------------------------------
      def import_floorplans(listings)
        listings.each_slice(BATCH_SIZE) { |batch| batch.each { |listing| upsert_floorplan(listing) } }
      end

      def upsert_floorplan(data)
        fp = Floorplan.find_or_initialize_by(
          provider: PROVIDER,
          community_id: community.id,
          provider_floorplan_id: data['remote_listing_id']
        )

        return if fp.manual_override

        fp.assign_attributes(
          name: data['name'],
          bedrooms: data['bed'],
          bathrooms: data['bath'],
          square_feet: data['sqft'] || data['sqft_max'],
          market_rent: data['price'] || data['price_max'],
          unit_count: data['units']&.size,
          units_available: available_units_count(data),
          provider_floorplan_id: data['remote_listing_id']
        )

        add_floorplan_images(fp, data['photos'])
        fp.save!
      end

      def add_floorplan_images(fp, photos)
        return if photos.blank?
      
        image_urls = photos.first(2).map do |photo|
          photo_id = photo.is_a?(Hash) ? photo[:id] || photo['id'] : photo&.id
          "https://cdn.apartmentlist.com/image/upload/#{photo_id}.jpg" if photo_id.present?
        end.compact
      
        fp.image = image_base64(image_urls[0]) if image_urls[0]
        fp.secondary_image = image_base64(image_urls[1]) if image_urls[1]
      end

      def image_base64(image_url)
        return unless image_url.present?
    
        encoded_url = URI::DEFAULT_PARSER.escape(image_url) #URI.encode(image_url)
        uri = URI.parse(encoded_url)
        file = uri.open
        image_data = file.read
        encoded_image = Base64.strict_encode64(image_data)
        "data:image/png;base64,#{encoded_image}"
      # rescue ::OpenURI::HTTPError => e
      #   raise e
      # rescue StandardError => e
        # raise e
      rescue
        ""
      end

      def available_units_count(data)
        data['units']&.count { |u| u['availability'] == 'available' } || 0
      end

      # ------------------------------
      # Units
      # ------------------------------
      def import_units(listings)
        listings.each_slice(BATCH_SIZE) { |batch| batch.each { |listing| import_listing_units(listing) } }
      end

      def import_listing_units(listing)
        listing['units']&.each { |unit_data| upsert_unit(unit_data, listing) }
      end

      def upsert_unit(data, listing)
        unit = Unit.find_or_initialize_by(
          provider: PROVIDER,
          community_id: community.id,
          provider_unit_id: data['remote_listing_id']
        )
        return if unit.manual_override

        unit.assign_attributes(
          marketing_name: data['display_name'],
          floorplan_id: listing['remote_listing_id'],
          unit_type: listing['name'],
          square_feet: data['sqft'],
          market_rent: data['base_price'],
          effective_rent: data['price'],
          availability: data['availability'],
          available_date: parse_date(data['available_on']),
          available: data['availability'] == 'available',
          lease_term: data['lease_length'],
          availability_url: data['apply_online_url']
        )
        unit.save!
      end
    end
  end
end
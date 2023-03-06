module LeadsUploader
  class BaseService
    attr_reader :community_id, :email, :favorites

    def initialize community_id, email, favorites
      begin
        @favorites = favorites
        @email = email
        @community = Community.find community_id

        return unless (@community && @community&.crm_credential).present?
      rescue => error
        return
      end
    end

    protected

    def format_favorites_message units, floorplans, amenities, message_text = "" 
      message_text += "Unit: #{units}\n" if units.present?
      message_text += "Floorplan: #{floorplans}\n" if floorplans.present?
      message_text += "Amenity: #{amenities}" if amenities.present?
      message_text 
    end

    def favorit_items
      floorplans = @favorites.map{|fav| fav&.name if fav.class.name == "Floorplan" }&.compact&.join(', ')
      units = @favorites.map{|fav| fav&.marketing_name if fav.class.name == "Unit" }&.compact&.join(', ')
      amenities = @favorites.map{|fav| fav&.name if fav.class.name == "Amenity" }&.compact&.join(', ')
      format_favorites_message(units, floorplans, amenities) 
    end

    def message
      "#{@email},\nThank you for visiting #{@community.name}, Here are your favorites:\n#{favorit_items}"
    end

    def request_type
      "lead"
    end

    def first_name
      "Not Required"
    end

    def last_name
      "Not Required"
    end

    def phone
      "(000)000-0000"
    end

    def email
      @email
    end

    def zip_code
      @community&.zip
    end

    def city
      @community&.city
    end

    def state
      @community&.state
    end

    def address_1
      @community&.address
    end

    def address_2
      ""
    end

    def source
      "G5"
    end

    def secondary_source
      "ILS-Ads"
    end
  end
end
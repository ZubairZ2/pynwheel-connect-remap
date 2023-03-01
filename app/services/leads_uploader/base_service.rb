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

    def favorit_items msg = ""
      floorplans = @favorites.map{|fav| fav&.name if fav.class.name == "Floorplan" }.compact.uniq.join(', ')
      units = @favorites.map{|fav| fav&.marketing_name if fav.class.name == "Unit" }.compact.uniq.join(', ')
      amenities = @favorites.map{|fav| fav&.name if fav.class.name == "Amenity" }.compact.uniq.join(', ')
    end

    def extra_text
      " + 2 more"
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
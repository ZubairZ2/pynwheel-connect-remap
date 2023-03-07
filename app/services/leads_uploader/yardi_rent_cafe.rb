module LeadsUploader
  class YardiRentCafe < LeadsUploader::BaseService

    def leads_uploader
      return unless verify_credentials
      HTTParty.get( api_url )
    end

    private

    def api_url
      "#{@community.credential.yardi_rent_cafe_api_url}/rentcafeapi.aspx?requestType=#{request_type}&firstName=#{first_name}&lastName=#{last_name}&phone=#{phone}&message=#{message}&email=#{email}&source=#{source}&secondarySource=#{secondary_source}&addr1=#{address_1}&addr2=#{address_2}&city=#{city}&state=#{state}&ZIPCode=#{zip_code}&#{get_credentials_query_params}"
    end

    def property_id
      @community&.crm_credential&.yardirentcafe_property_id
    end

    def property_code
      @community&.crm_credential&.yardirentcafe_property_code
    end

    def api_token
      @community&.crm_credential&.yardirentcafe_marketing_api_key
    end

    def verify_credentials
      api_token.present? && (property_id.present? || property_code.present?)
    end

    def get_credentials_query_params
      if api_token.present?
        if property_id.present?
          "propertyId=#{property_id}&apiToken=#{api_token}"
        elsif property_code.present?
          "propertyCode=#{property_code}&apiToken=#{api_token}"
        end
      end
    end

  end
end
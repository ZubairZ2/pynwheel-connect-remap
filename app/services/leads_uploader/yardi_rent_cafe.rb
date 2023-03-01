module LeadsUploader
  class YardiRentCafe < LeadsUploader::BaseService

    def leads_uploader
      return unless verify_credentials
      HTTParty.get( api_url )
    end

    private

    def api_url
      "#{@community.credential.yardi_rent_cafe_api_url}/rentcafeapi.aspx?requestType=#{request_type}&firstName=#{first_name}&lastName=#{last_name}&phone=#{phone}&message=#{message}&email=#{email}&username=#{user_name}&password=#{password}&source=#{source}&secondarySource=#{secondary_source}&addr1=#{address_1}&addr2=#{address_2}&city=#{city}&state=#{state}&ZIPCode=#{zip_code}&propertyCode=#{property_code}&propertyId=#{property_id}&apiToken=#{api_token}"
    end

    def user_name
      @community&.crm_credential&.yardirentcafe_leads_api_user_name
    end

    def password
      @community&.crm_credential&.yardirentcafe_leads_api_password
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
      (property_id && property_code && api_token && user_name && password).present?
    end

  end
end
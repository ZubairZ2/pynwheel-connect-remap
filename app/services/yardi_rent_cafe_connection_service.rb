class YardiRentCafeConnectionService < BaseService

  def perform
    property_codes = credentials.p_code.split(',') rescue []
    property_code = property_codes[0]
    begin
      request_type = "apartmentavailability"
      company_code = credentials.c_code
      api_token = credentials.api_token
      property_code = credentials.p_code
      showallunit =  credentials.limit_result ? "0" : "-1"
      
      if api_token.present?
        @url = "#{credentials.yardi_rent_cafe_api_url}/rentcafeapi.aspx?requestType=#{request_type}&APIToken=#{api_token}&propertycode=#{property_code}&showallunit=-1" 
      else
        @url = "#{credentials.yardi_rent_cafe_api_url}/rentcafeapi.aspx?requestType=#{request_type}&companyCode=#{company_code}&propertycode=#{property_code}&showallunit=-1"
      end
      
      response = HTTParty.get(@url)
      JSON.parse(response.body)
    rescue
      false
    end
  end
end
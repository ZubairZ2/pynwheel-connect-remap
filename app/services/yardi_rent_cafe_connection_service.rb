class YardiRentCafeConnectionService < BaseService

	def perform
		begin
		    request_type = "apartmentavailability"
		    company_code = credentials.c_code
		    property_code = credentials.p_code
		    
		    response = HTTParty.get("https://api.rentcafe.com/rentcafeapi.aspx?requestType=#{request_type}&companyCode=#{company_code}&propertycode=#{property_code}&showallunit=-1")
		    JSON.parse(response.body)
		rescue
			false
		end
  	end
end
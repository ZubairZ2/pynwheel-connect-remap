class YardiRentCafeConnectionService < BaseService
  def perform
    begin
      property_code = credentials&.p_code&.split(",")[0] rescue ""
      property_code = property_code&.strip
      RentCafeApiV2Service.new(credentials&.community_id).get_appartment_availability(property_code) if property_code.present?
    rescue
      false
    end
  end
end
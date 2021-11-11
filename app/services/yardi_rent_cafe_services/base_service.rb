module YardiRentCafeServices
  class BaseService
    def initialize scheduled_tour
      @scheduled_tour = scheduled_tour
      @tour_user = @scheduled_tour.tour_user
      @community = @scheduled_tour.community
      @api_key = @community&.crm_credential&.yardirentcafe_marketing_api_key
      @company_code =@community&.crm_credential&.yardirentcafe_company_code
      @property_code = @community&.crm_credential&.yardirentcafe_property_code
    end
  end
end
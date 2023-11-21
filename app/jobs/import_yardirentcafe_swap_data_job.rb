class ImportYardirentcafeSwapDataJob < ApplicationJob
  #queue_as :default
  include SuckerPunch::Job

  def perform(credentials)
    credentials = JSON.parse(credentials)
    if credentials["rentcafe_api_version"] == "RentCafe V2"
      yardi_rent_cafe_swap_service = YardiRentCafeV2SwapService.new(credentials)
    else
      yardi_rent_cafe_swap_service = YardiRentCafeSwapService.new(credentials)
    end

    yardi_rent_cafe_swap_service.perform
  end
end

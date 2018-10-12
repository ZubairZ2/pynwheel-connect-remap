class ImportYardirentcafeSwapDataJob < ApplicationJob
  #queue_as :default
  include SuckerPunch::Job

  def perform(credentials)

    yardi_rent_cafe_swap_service = YardiRentCafeSwapService.new(JSON.parse(credentials))
    yardi_rent_cafe_swap_service.perform
  end
end

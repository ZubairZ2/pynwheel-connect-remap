class ImportYardirentcafeSwapDataJob < ApplicationJob
  #queue_as :default
  include SuckerPunch::Job

  def perform(credentials)

    yardi_rent_cafe_swap_service = YardiRentCafeSwapService.new(credential.attributes)
    yardi_rent_cafe_swap_service.perform
  end
end

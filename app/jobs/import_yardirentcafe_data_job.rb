class ImportYardirentcafeDataJob < ApplicationJob
  include SuckerPunch::Job

  def perform(credentials)
    yardi_rent_cafe_service = YardiRentCafeService.new(JSON.parse(credentials))
    yardi_rent_cafe_service.perform
  end
end

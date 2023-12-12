class ImportYardirentcafeDataJob < ApplicationJob
  include SuckerPunch::Job
  max_jobs 20
  workers 4

  def perform(credentials)
    ActiveRecord::Base.connection_pool.with_connection do
      if community&.credential.rentcafe_api_version == "RentCafe V2"
        yardi_rent_cafe_service = YardiRentCafeV2Service.new(community&.credential)
      else
        yardi_rent_cafe_service = YardiRentCafeService.new(community&.credential)
      end

      yardi_rent_cafe_service.perform
    end
  end
end

class ImportZarembaStaticDataJob < ApplicationJob
  include SuckerPunch::Job

  def perform(credentials)
    zaremba_static_service = ZarembaStaticService.new(JSON.parse(credentials))
    zaremba_static_service.perform

    # zaremba_service = ZarembaService.new(JSON.parse(credentials))
    # zaremba_service.perform
  end
end

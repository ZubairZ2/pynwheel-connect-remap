class ImportZarembaDataJob < ApplicationJob
  include SuckerPunch::Job

  def perform(credentials)
    zaremba_service = ZarembaService.new(JSON.parse(credentials))
    zaremba_service.perform

    # zaremba_static_service = ZarembaService.new(JSON.parse(credentials))
    # zaremba_static_service.perform
  end
end

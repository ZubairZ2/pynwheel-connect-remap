class ImportZarembaDataJob < ApplicationJob
  include SuckerPunch::Job
  workers 4

  def perform(credentials)
    zaremba_service = ZarembaService.new(JSON.parse(credentials))
    zaremba_service.perform
  end
end

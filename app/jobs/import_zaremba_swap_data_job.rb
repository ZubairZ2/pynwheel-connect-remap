class ImportZarembaSwapDataJob < ApplicationJob
  include SuckerPunch::Job

  def perform(credentials)
    zaremba_swap_service = ZarembaSwapService.new(JSON.parse(credentials))
    zaremba_swap_service.perform

    # zaremba_service = ZarembaService.new(JSON.parse(credentials))
    # zaremba_service.perform
  end
end

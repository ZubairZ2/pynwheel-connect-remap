class ImportResman4SwapDataJob < ApplicationJob
  include SuckerPunch::Job

  def perform(credentials)
    resman_swap_service = Resman4SwapService.new(JSON.parse(credentials))
    resman_swap_service.perform
  end
end

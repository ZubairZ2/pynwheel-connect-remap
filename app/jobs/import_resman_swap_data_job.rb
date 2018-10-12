class ImportResmanSwapDataJob < ApplicationJob
  #queue_as :default
  include SuckerPunch::Job

  def perform(credentials)
    resman_swap_service = ResmanSwapService.new(JSON.parse(credentials))
    resman_swap_service.perform
  end
end

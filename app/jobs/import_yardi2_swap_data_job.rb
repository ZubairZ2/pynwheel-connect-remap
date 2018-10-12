class ImportYardi2SwapDataJob < ApplicationJob
  #queue_as :default
  include SuckerPunch::Job

  def perform(credentials)

    yardi2_swap_service = Yardi2SwapService.new(JSON.parse(credentials))
    yardi2_swap_service.perform
  end
end

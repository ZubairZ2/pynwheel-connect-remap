class ImportYardi2SwapDataJob < ApplicationJob
  #queue_as :default
  include SuckerPunch::Job

  def perform(credentials)

    yardi2_swap_service = Yardi2SwapService.new(credential.attributes)
    yardi2_swap_service.perform
  end
end

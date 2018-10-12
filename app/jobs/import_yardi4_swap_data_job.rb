class ImportYardi4SwapDataJob < ApplicationJob
  #queue_as :default
  include SuckerPunch::Job

  def perform(credentials)

    yardi4_swap_service = Yardi4SwapService.new(credential.attributes)
    yardi4_swap_service.perform
  end
end

class ImportRealpageSvcSwapDataJob < ApplicationJob
  #queue_as :default
  include SuckerPunch::Job

  def perform(credentials)

    real_page_svc_swap_service = RealPageSvcSwapService.new(credential.attributes)
    real_page_svc_swap_service.perform
  end
end

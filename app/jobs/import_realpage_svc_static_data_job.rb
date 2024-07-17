class ImportRealpageSvcStaticDataJob < ApplicationJob
  include SuckerPunch::Job

  def perform(credentials)
    real_page_svc_static_service = RealPageSvcStaticService.new(JSON.parse(credentials))
    real_page_svc_static_service.perform
  end
end

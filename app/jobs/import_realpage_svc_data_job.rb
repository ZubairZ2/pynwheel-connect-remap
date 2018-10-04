class ImportRealpageSvcDataJob < ApplicationJob
  include SuckerPunch::Job

  def perform(credentials)

    # real_page_svc_static_service = RealPageSvcStaticService.new(JSON.parse(credentials))
    # real_page_svc_static_service.perform

    real_page_svc_service = RealPageSvcService.new(JSON.parse(credentials))
    real_page_svc_service.perform
  end
end

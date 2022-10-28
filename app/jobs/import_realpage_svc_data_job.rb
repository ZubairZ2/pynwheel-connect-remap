class ImportRealpageSvcDataJob < ApplicationJob
  include SuckerPunch::Job
  #workers 4
  
  def perform(credentials)
    real_page_svc_service = RealPageSvcService.new(JSON.parse(credentials))
    real_page_svc_service.perform
  end
end

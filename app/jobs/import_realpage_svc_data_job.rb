class ImportRealpageSvcDataJob < ApplicationJob
  include SuckerPunch::Job
  #workers 4
  
  def perform(credentials)
    ActiveRecord::Base.connection_pool.with_connection do
      real_page_svc_service = RealPageSvcService.new(JSON.parse(credentials))
      real_page_svc_service.perform
    end
  end
end

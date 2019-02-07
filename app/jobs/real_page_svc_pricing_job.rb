class RealPageSvcPricingJob < ApplicationJob
  include SuckerPunch::Job

  def perform(credentials)
    real_page_svc_pricing = RealPageSvcPricingConnectionService.new(JSON.parse(credentials))
    real_page_svc_pricing.perform
  end
end

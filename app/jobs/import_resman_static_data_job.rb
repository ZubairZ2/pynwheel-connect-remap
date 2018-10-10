class ImportResmanStaticDataJob < ApplicationJob
  include SuckerPunch::Job

  def perform(credentials)

    resman_static_service = ResmanStaticService.new(JSON.parse(credentials))
    resman_static_service.perform

    # yardi2_service = Yardi2Service.new(JSON.parse(credentials))
    # yardi2_service.perform
  end
end

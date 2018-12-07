class ImportYardi2StaticDataJob < ApplicationJob
  include SuckerPunch::Job

  def perform(credentials)

    yardi2_static_service = Yardi2StaticService.new(JSON.parse(credentials))
    yardi2_static_service.perform

    # yardi2_service = Yardi2Service.new(JSON.parse(credentials))
    # yardi2_service.perform
  end
end

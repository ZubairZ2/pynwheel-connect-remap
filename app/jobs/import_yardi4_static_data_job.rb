class ImportYardi4StaticDataJob < ApplicationJob
  include SuckerPunch::Job

  def perform(credentials)

    yardi4_static_service = Yardi4StaticService.new(JSON.parse(credentials))
    yardi4_static_service.perform

    # yardi4_service = Yardi4Service.new(JSON.parse(credentials))
    # yardi4_service.perform
  end
end

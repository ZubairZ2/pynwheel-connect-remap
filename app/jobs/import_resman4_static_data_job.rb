class ImportResman4StaticDataJob < ApplicationJob
  include SuckerPunch::Job

  def perform(credentials)
    resman_static_service = Resman4StaticService.new(JSON.parse(credentials))
    resman_static_service.perform
  end
end
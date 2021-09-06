class ImportResman4DataJob < ApplicationJob
  include SuckerPunch::Job

  def perform(credentials)

    # resman_static_service = ResmanStaticService.new(JSON.parse(credentials))
    # resman_static_service.perform

    resman_service = Resman4Service.new(JSON.parse(credentials))
    resman_service.perform
  end
end

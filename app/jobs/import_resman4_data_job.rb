class ImportResman4DataJob < ApplicationJob
  include SuckerPunch::Job
  workers 4

  def perform(credentials)
    resman_service = Resman4Service.new(JSON.parse(credentials))
    resman_service.perform
  end
end

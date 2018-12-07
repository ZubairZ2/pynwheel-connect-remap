class ImportExperimentalYardi4DataJob < ApplicationJob
  include SuckerPunch::Job

  def perform(credentials)
    yardi4_service = ExperimentalYardi4Service.new(JSON.parse(credentials))
    yardi4_service.perform
  end
end

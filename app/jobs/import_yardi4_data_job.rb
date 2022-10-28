class ImportYardi4DataJob < ApplicationJob
  include SuckerPunch::Job
  #workers 4

  def perform(credentials)
    yardi4_service = Yardi4Service.new(JSON.parse(credentials))
    yardi4_service.perform
  end
end

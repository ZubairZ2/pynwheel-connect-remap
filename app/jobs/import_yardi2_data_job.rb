class ImportYardi2DataJob < ApplicationJob
  include SuckerPunch::Job
  #workers 4

  def perform(credentials)
    yardi2_service = Yardi2Service.new(JSON.parse(credentials))
    yardi2_service.perform
  end
end

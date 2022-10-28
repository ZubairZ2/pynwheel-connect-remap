class ImportResmanDataJob < ApplicationJob
  include SuckerPunch::Job
  #workers 4
  
  def perform(credentials)
    resman_service = ResmanService.new(JSON.parse(credentials))
    resman_service.perform
  end
end

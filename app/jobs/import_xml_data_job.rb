class ImportXmlDataJob < ApplicationJob
  include SuckerPunch::Job
  #workers 4
  
  def perform(credentials)
    xml_service = XmlService.new(JSON.parse(credentials))
    xml_service.perform
  end
end

class ImportXmlDataJob < ApplicationJob
  include SuckerPunch::Job

  def perform(credentials)

    xml_service = XmlService.new(JSON.parse(credentials))
    xml_service.perform

  end
end

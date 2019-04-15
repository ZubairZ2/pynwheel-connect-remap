class ImportXmlStaticDataJob < ApplicationJob
  include SuckerPunch::Job

  def perform(credentials)

    xml_static_service = XmlStaticService.new(JSON.parse(credentials))
    xml_static_service.perform

  end
end

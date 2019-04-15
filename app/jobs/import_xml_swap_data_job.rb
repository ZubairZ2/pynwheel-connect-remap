class ImportXmlSwapDataJob < ApplicationJob
  include SuckerPunch::Job

  def perform(credentials)
    xml_swap_service = XmlSwapService.new(JSON.parse(credentials))
    xml_swap_service.perform

  end
end

class XmlConnectionService < BaseService
  def perform
    filename = credentials.xml_filename
    domain   = credentials&.xml_domain&.strip
    return false if filename.blank? || domain.blank?

    url = build_url(filename)
    response = HTTParty.get(URI::DEFAULT_PARSER.escape(url))

    property = find_matching_property(response, domain)
    return no_match_response(domain) unless property

    sanitize_xml(property).to_xml
  rescue StandardError => e
    false
  end

  private

  def build_url(filename)
    xml_file = filename.end_with?('.xml') ? filename : "#{filename}.xml"
    "http://pynwheel.com/swoop/datafeeds/#{xml_file}"
  end

  def find_matching_property(response, domain)
    properties = Array(response.dig('PhysicalProperty', 'Property'))

    properties.find do |property|
      ids = property.dig('PropertyID', 'Identification')
      next false unless ids

      ids['SecondaryID'] == domain || ids['PrimaryID'] == domain
    end
  end

  def sanitize_xml(data)
    eval(data.to_s.gsub('xsi:', ''))
  end

  def no_match_response(domain)
    { data: "No result match with property id #{domain}" }
  end
end
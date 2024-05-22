class XmlConnectionService < BaseService
  def perform
    begin
      filename = credentials.xml_filename
      domain = credentials&.xml_domain&.strip
      url = "http://pynwheel.com/swoop/datafeeds/#{filename.include?(".xml") ? filename : "#{filename}.xml"}"
      
      response = HTTParty.get(URI.encode(url))

      result = ""

      if response['PhysicalProperty']['Property'].class == Array
        response['PhysicalProperty']['Property'].each do |p|
          if p['PropertyID']['Identification']['SecondaryID'].present?
            if p['PropertyID']['Identification']['SecondaryID'] == domain
              result = p
            end
          end
        end
      else
        p = response['PhysicalProperty']['Property']

        if p['PropertyID']['Identification']['SecondaryID'] == domain
          result = p
        else
          result = "<data>No result match with property id "+ property_id + "</data>"
        end
      end

      result = result.to_s.gsub("xsi:","")
      result = eval(result)
      result.to_xml
    rescue => e
      false
    end
  end

end
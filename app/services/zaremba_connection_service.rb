class ZarembaConnectionService < BaseService
  def perform
    begin
      property_ids = credentials.zaremba_property_id.split(',') rescue []
      property_id = property_ids[0]
      username = credentials.zaremba_username
      password = credentials.zaremba_password
      filename = credentials.zaremba_filename
      url = "http://pynwheel.com/swoop/scripts/proxy_redatasysSFTP.php"
      url = url + "?" + "filename=" + filename + ".xml" + "&" + "username=" + username + "&" + "password=" + password


      result = ""
      response = HTTParty.get(url)

      if response['PhysicalProperty']['Property'].class == Array
        response['PhysicalProperty']['Property'].each do |p|

          if p['IDValue'].present?
            if p['IDValue'] == property_id
              result = p
            end
          end
        end
      else
        p = response['PhysicalProperty']['Property']

        if p['IDValue'] == property_id
          result = p
        else
          result = "<data>No result match with property id "+ property_id + "</data>"
        end
      end
      result
    rescue => e
      false
    end    
  end 
end
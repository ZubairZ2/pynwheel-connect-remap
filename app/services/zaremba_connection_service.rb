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

      response['PhysicalProperty']['Property'].each do |p|

        if p['IDValue'] == '030'
          result = p
        end
      end
      result
    rescue => e
      false
    end    
  end 
end
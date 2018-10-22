class ZarembaConnectionService < BaseService
  def perform
    begin
      property_ids = credentials.zaremba_filename.split(',') rescue []
      property_id = property_ids[0]
      username = credentials.zaremba_username
      password = credentials.zaremba_password

      url = "http://pynwheel.com/swoop/scripts/proxy_redatasysSFTP.php"
      url = url + "?" + "filename=" + property_id + ".xml" + "&" + "username=" + username + "&" + "password=" + password


      
      response = HTTParty.get(url)

      response
    rescue => e
      false
    end    
  end 
end
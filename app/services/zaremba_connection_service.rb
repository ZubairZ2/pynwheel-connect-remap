class ZarembaConnectionService < BaseService
  def perform
    begin
      property_ids = credentials.zaremba_filename.split(',') rescue []
      property_id = property_ids[0]

      url = "http://pynwheel.com/swoop/scripts/proxy_redatasysSFTP.php"
      url = url + "?" + "filename=" + property_id + ".xml"

      username = credentials.zaremba_username
      password = credentials.zaremba_password
      
      response = HTTParty.post(url,:body => {
          "user_name": username,
          "user_pass": password,
      },
          :headers => { 'Content-Type' => 'text/xml' } )

      response
    rescue => e
      false
    end    
  end 
end
class ZarembaConnectionService < BaseService
  def perform
    begin
      property_ids = credentials.zaremba_filename.split(',') rescue []
      property_id = property_ids[0]

      url = "http://pynwheel.com/swoop/scripts/proxy_redatasysSFTP.php"
      url = url + "?" + "filename=" + property_id + ".xml"

      apikey = credentials.resman_apikey
      partner_id = credentials.resman_partner_id
      account_id = credentials.resman_account_id
      
      response = HTTParty.get(url)

      response
    rescue => e
      false
    end    
  end 
end
class ZarembaConnectionService < BaseService
  def perform
    begin
      url = "http://pynwheel.com/swoop/scripts/proxy_redatasysSFTP.php?filename=ZAREMBA.xml"
      apikey = credentials.resman_apikey
      partner_id = credentials.resman_partner_id
      account_id = credentials.resman_account_id
      property_ids = credentials.property_id.split(',') rescue []
      property_id = property_ids[0]
      
      response = HTTParty.get(url)
      
      response
    rescue => e
      false
    end    
  end 
end
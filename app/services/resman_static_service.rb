class PsiService < BaseService
  def perform
    property_ids = credentials.resman_property_id.split(',') rescue []
    property_ids.each do |property_id|
      begin
        apikey = credentials.resman_apikey
        partner_id = credentials.resman_partner_id
        account_id = credentials.resman_account_id
        #property_id = credentials.property_id
        url = "https://api.myresman.com/MITS/GetMarketing2_0"
        response = HTTParty.post(url,
                                 :body => {
                                     "ApiKey":"9412bd2716b648c1b00b62643e63850b",
                                     "IntegrationPartnerID":"1214",
                                     "AccountID":"800",
                                     "PropertyID":"c575691a-ede4-4347-af2e-cdb610557108",
                                 }.to_json,
                                 :headers => { 'Content-Type' => 'application/x-www-form-urlencoded' } )
        response =  JSON.parse(response.body)
        # if response["response"]["code"] == 200
        #   units = []
        #   floorplans = []
        #   response['response']['result']["PhysicalProperty"]["Property"].each do |pro|
        #     pro["ILS_Unit"].each do |ils|
        #       units << ils
        #     end
        #     pro["Floorplan"].each do |f|
        #       floorplans << f
        #     end
        #   end
        #   save_psi_units(units,property_id)
        #   save_psi_floorplans(floorplans,property_id)
        #   save_website_column_of_community(response)
        #   #else
        #   #puts '-----------------------------' , response["response"]["error"]["message"]
        #   #ExceptionNotifier.notify_exception(Exception.new,data: {message: response["response"]["error"]["message"],community_id: credentials.community_id})
        # end
      rescue => e
        puts '----------------------------' , e.message
        #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
      end
    end
    fill_psi_pricing_details
  end


end
module ZervServices
  class GetAuditLogsService < ZervServices::BaseService
    def execute(args)
      url = base_url + "/useraudit"
      id_token = get_id_token

      puts '--------------------------    Zerv get all users audit logs    ------------------------'
      response = HTTParty.get(url,
          headers: { 'Authorization' => id_token, 'Content-Type' => 'application/json'})
      
      puts url
      puts "***"*50
      puts response
    
    rescue HTTParty::Error => e
        OpenStruct.new({success?: false, error: e, payload: nil})
    else
      if response["code"] == "200" and ["success", "SUCCESS"].include?(response["status"])
        OpenStruct.new({success?: true, error: nil, payload: response})  
      else
        OpenStruct.new({success?: false, error: response, payload: nil})  
      end
    end
  end
end
module ZervServices
  class ImportLockService < ZervServices::BaseService

    def execute(args)
      test_connection = args[:test_connection]
      url = base_url + "/clientdevice"
      id_token = get_id_token
      response = HTTParty.get(url,
        headers: { 'Authorization' => id_token, 'Content-Type' => 'application/json'})

    rescue HTTParty::Error => e
      OpenStruct.new({success?: false, error: e, payload: nil})
    else
      if response["code"] == "200"  
        current_community_zerv_locks(response)
        InsertZervLocksJob.perform_async response, @zerv if !test_connection and !(response["listGetDevices"].instance_of? String)
        OpenStruct.new({success?: true, error: nil, payload: response})  
      else
        OpenStruct.new({success?: false, error: response, payload: nil})  
      end
    end
  end
end



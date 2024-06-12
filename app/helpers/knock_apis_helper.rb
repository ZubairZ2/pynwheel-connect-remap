module KnockApisHelper
  # Create a prospect on knock crm
  def create_prospect knock_api_key, payload
    url = "#{ENV["KNOCK_BASE_URL"]}/prospect"
    response = HTTParty.post(url,
      body: payload.to_json,
      headers: { 
      'Content-Type' => 'application/json',
      'x-api-key' => knock_api_key
      }
    )
  
  rescue HTTParty::Error => e
    OpenStruct.new({success?: false, error: e, payload: nil})
  else
    OpenStruct.new({success?: true, error: nil, payload: response})
  end

  # create an appointment of a prospect on knock crm
  def create_appointment knock_api_key, payload
    url = "#{ENV["KNOCK_BASE_URL"]}/appointment/request"
    response = HTTParty.post(url,
      body: payload.to_json,
      headers: {
      'Content-Type' => 'application/json',
      'x-api-key' => knock_api_key
      }
    )

  rescue HTTParty::Error => e
    OpenStruct.new({success?: false, error: e, payload: nil})
  else
    OpenStruct.new({success?: true, error: nil, payload: response})
  end

  # cancel an appointment of a prospect on knock crm
  def cancel_appointment knock_api_key, appointment_id
    url = "#{ENV["KNOCK_BASE_URL"]}/appointment/#{appointment_id}/cancel"

    response = HTTParty.put(url,
      headers: {
      'Content-Type' => 'application/json',
      'x-api-key' => knock_api_key
      }
    )

  rescue HTTParty::Error => e
    OpenStruct.new({success?: false, error: e, payload: nil})
  else
    OpenStruct.new({success?: true, error: nil, payload: response})
  end

  # get available time slots of a community
  def get_community_available_times knock_api_key, community_id, self_guided
    url = "#{ENV["KNOCK_BASE_URL"]}/community/#{community_id}/available-times?forSelfGuided=#{self_guided}"

    response = HTTParty.get(url, 
      headers: { 
      'Content-Type' => 'application/json',
      'x-api-key' => knock_api_key
      }
    )

  rescue HTTParty::Error => e
    OpenStruct.new({success?: false, error: e, payload: nil})
  else
    OpenStruct.new({success?: true, error: nil, payload: response})
  end

   # get sources of a community
  def get_community_sources knock_api_key, community_id
    url = "#{ENV["KNOCK_BASE_URL"]}/community/#{community_id}/sources"

    response = HTTParty.get(url, 
      headers: { 
      'Content-Type' => 'application/json',
      'x-api-key' => knock_api_key
      }
    )

  rescue HTTParty::Error => e
    OpenStruct.new({success?: false, error: e, payload: nil})
  else
    OpenStruct.new({success?: true, error: nil, payload: response})
  end

  # create a visit for a prospect
  def create_visit knock_api_key, payload
    url = "#{ENV["KNOCK_BASE_URL"]}/visit"

    response = HTTParty.post(url,
      body: payload.to_json,
      headers: {
      'Content-Type' => 'application/json',
      'x-api-key' => knock_api_key
      }
    )

  rescue HTTParty::Error => e
    OpenStruct.new({success?: false, error: e, payload: nil})
  else
    OpenStruct.new({success?: true, error: nil, payload: response})
  end
end
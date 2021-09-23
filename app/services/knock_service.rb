class KnockService < BaseService

  def initialize knock_api_key
    @knock_api_key = knock_api_key
  end
 
  # Create a prospect on knock crm
  def create_prospect payload
    url = "#{ENV["KNOCK_BASE_URL"]}/prospect"

    response = HTTParty.post(url,
      body: payload.to_json,
      headers: { 
      'Content-Type' => 'application/json',
      'x-api-key' => @knock_api_key
      }
    )
  
  rescue HTTParty::Error => e
    OpenStruct.new({success?: false, error: e, payload: nil})
  else
    OpenStruct.new({success?: true, error: nil, payload: response})
  end

  # create an appointment of a prospect on knock crm
  def create_appointment payload
    url = "#{ENV["KNOCK_BASE_URL"]}/appointment/request"

    response = HTTParty.post(url,
      body: payload,
      headers: {
      'Content-Type' => 'application/json',
      'x-api-key' => @knock_api_key
      }
    )

  rescue HTTParty::Error => e
    OpenStruct.new({success?: false, error: e, payload: nil})
  else
    OpenStruct.new({success?: true, error: nil, payload: response})
  end

  # cancel an appointment of a prospect on knock crm
  def cancel_appointment appointment_id
    url = "#{ENV["KNOCK_BASE_URL"]}/appointment/#{appointment_id}/cancel"

    response = HTTParty.put(url,
      headers: {
      'Content-Type' => 'application/json',
      'x-api-key' => @knock_api_key
      }
    )

  rescue HTTParty::Error => e
    OpenStruct.new({success?: false, error: e, payload: nil})
  else
    OpenStruct.new({success?: true, error: nil, payload: response})
  end

  # get available time slots of a community
  def get_community_available_times community_id
    url = "#{ENV["KNOCK_BASE_URL"]}/community/#{community_id}/available-times"

    response = HTTParty.get(url, 
      headers: { 
      'Content-Type' => 'application/json',
      'x-api-key' => @knock_api_key
      }
    )

  rescue HTTParty::Error => e
    OpenStruct.new({success?: false, error: e, payload: nil})
  else
    OpenStruct.new({success?: true, error: nil, payload: response})
  end

  # create a visit for a prospect
  def create_visit payload
    url = "#{ENV["KNOCK_BASE_URL"]}/visit"

    response = HTTParty.post(url,
      body: payload,
      headers: {
      'Content-Type' => 'application/json',
      'x-api-key' => @knock_api_key
      }
    )

  rescue HTTParty::Error => e
    OpenStruct.new({success?: false, error: e, payload: nil})
  else
    OpenStruct.new({success?: true, error: nil, payload: response})
  end
end
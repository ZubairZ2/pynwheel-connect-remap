class PynwheelAccessService < BaseService
  def initialize()
  end

# login to pynwheel access on Zerv portal
  def pynwheel_access_login
    url = "#{ENV["PYNWHEEL_ACCESS_BASE_URL"]}/v1/portal/login"

    response = HTTParty.post(url,
      body: {
        username: ENV["PYNWHEEL_ACCESS_USER_NAME"],
        password: 'PynWheel123#'
      }.to_json,
      headers: { 'Content-Type' => 'application/json'})

  rescue HTTParty::Error => e
    OpenStruct.new({success?: false, error: e, payload: nil})
  else
    OpenStruct.new({success?: true, error: nil, payload: response})
  end

# get pynwheel access users list
  def pynwheel_access_get_users token
    url = "#{ENV["PYNWHEEL_ACCESS_BASE_URL"]}/v1/portal/getusers"
    response = HTTParty.get(url, 
      headers: { 
      'Content-Type' => 'application/json',
      'Authorization' => token
      }
    )

  rescue HTTParty::Error => e
    OpenStruct.new({success?: false, error: e, payload: nil})
  else
    OpenStruct.new({success?: true, error: nil, payload: response})
  end

#Delete pynwhel access user
  def pynwheel_access_delete_user(phone_number, token)
    url = "https://h9xrj68d51.execute-api.us-east-1.amazonaws.com/StageAccessPortal/v1/portal/user/deleteuser/#{phone_number}"

    response = HTTParty.delete(url, 
      headers: { 
      'Content-Type' => 'application/json',
      'Authorization' => token
      }
    )

  rescue HTTParty::Error => e
    OpenStruct.new({success?: false, error: e, payload: nil})
  else
    OpenStruct.new({success?: true, error: nil, payload: response})
  end

# get all sub locations of a location
  def get_pynwheel_access_sub_locations(location_name, token)
    url = ("#{ENV["PYNWHEEL_ACCESS_BASE_URL"]}/v1/portal/location/#{location_name}").gsub(' ','%20')

    response = HTTParty.get(url, 
      headers: { 
      'Content-Type' => 'application/json',
      'Authorization' => token
      }
    )

  rescue HTTParty::Error => e
    OpenStruct.new({success?: false, error: e, payload: nil})
  else
    OpenStruct.new({success?: true, error: nil, payload: response})
  end

#get all user accesses
  def get_pynwheel_user_accesses(phone_numbeer, customer_id, token)
    url = "#{ENV["PYNWHEEL_ACCESS_BASE_URL"]}/v1/portal/user/getuserwithtimezone/#{phone_numbeer}?customerId=#{customer_id}"

    response = HTTParty.get(url, 
      headers: { 
      'Content-Type' => 'application/json',
      'Authorization' => token
      }
    )

  rescue HTTParty::Error => e
    OpenStruct.new({success?: false, error: e, payload: nil})
  else
    OpenStruct.new({success?: true, error: nil, payload: response})
  end

  def update_pynwheel_access_user(user_data, token)
    url = "#{ENV["PYNWHEEL_ACCESS_BASE_URL"]}/v1/portal/user/updateuserandtimezone/#{user_data["id"]}"

    response = HTTParty.put(url,
      body: user_data.to_json,
      headers: { 
      'Content-Type' => 'application/json',
      'Authorization' => token
      }
    )

  rescue HTTParty::Error => e
    OpenStruct.new({success?: false, error: e, payload: nil})
  else
    OpenStruct.new({success?: true, error: nil, payload: response})
  end

  def create_pynwheel_access_user(user_data, token)
    url = "#{ENV["PYNWHEEL_ACCESS_BASE_URL"]}/v1/portal/user/adduserwithtimezone"

    response = HTTParty.post(url,
      body: user_data.to_json, 
      headers: { 
      'Content-Type' => 'application/json',
      'Authorization' => token
      }
    )

  rescue HTTParty::Error => e
    OpenStruct.new({success?: false, error: e, payload: nil})
  else
    OpenStruct.new({success?: true, error: nil, payload: response})
  end
end
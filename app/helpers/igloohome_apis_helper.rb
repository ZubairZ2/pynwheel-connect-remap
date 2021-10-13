module IgloohomeApisHelper
  def get_paired_device time_zone,  payload
    url = "#{ENV["IGLOOHOME_API_BASE_URL"]}/v2/locks"

    response = HTTParty.post(url,
      body: {
        payload: payload,
        timezone: time_zone
      }.to_json,
      headers: { 
        'Content-Type' => 'application/json',
        'X-IGLOOCOMPANY-APIKEY' => ENV["IGLOOHOME_API_KEY"]
      })

  rescue HTTParty::Error => e
    OpenStruct.new({success?: false, error: e, payload: nil})
  else
    OpenStruct.new({success?: true, error: nil, payload: response})
  end

  def get_device_timezone time_zone
    url = "#{ENV["IGLOOHOME_API_BASE_URL"]}/v2/timezone/#{time_zone}"

    response = HTTParty.get(url,
      headers: { 
        'Content-Type' => 'application/json',
        'X-IGLOOCOMPANY-APIKEY' => ENV["IGLOOHOME_API_KEY"]
      })

  rescue HTTParty::Error => e
    OpenStruct.new({success?: false, error: e, payload: nil})
  else
    OpenStruct.new({success?: true, error: nil, payload: response})
  end

end
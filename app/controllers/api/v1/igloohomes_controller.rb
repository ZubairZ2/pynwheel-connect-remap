class Api::V1::IgloohomesController < ActionController::Base


  def timezone
    response = get_device_timezone(params[:timezone]) if params[:timezone].present?

    if response.present? && response["payload"].present? && response["payload"]["ranges"].present? &&  response["payload"]["gmtOffset"].present?
      render :json=> {status: true, respnse: response["payload"]}
    else
      render :json=> {status: false, respnse: "Failed to fetch the timezone"}
    end
  end

  def pairing
    response = get_paired_device(params[:timezone], params[:payload]) if params[:timezone].present? && params[:payload].present?

    if response.present? && response["payload"].present? && response["payload"]["bluetoothAdminKey"].present? &&  response["payload"]["masterPin"].present?
      render :json=> {status: true, respnse: response["payload"]}
    else
      render :json=> {status: false, respnse: "Failed to fetch the pairing data"}
    end
  end


  private

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
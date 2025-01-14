module KnockApisHelper
  # Create a prospect on knock crm
  def create_prospect payload, community_id, company_id
    url = "#{ENV["KNOCK_BASE_URL"]}/prospect"
    response = HTTParty.post(url, body: payload.to_json, headers: headers(community_id, company_id))
  
  rescue HTTParty::Error => e
    OpenStruct.new({success?: false, error: e, payload: nil})
  else
    OpenStruct.new({success?: true, error: nil, payload: response})
  end

  # create an appointment of a prospect on knock crm
  def create_appointment payload, community_id, company_id
    url = "#{ENV["KNOCK_BASE_URL"]}/appointment/request"
    
    response = HTTParty.post(url, body: payload.to_json, headers: headers(community_id, company_id))

  rescue HTTParty::Error => e
    OpenStruct.new({success?: false, error: e, payload: nil})
  else
    OpenStruct.new({success?: true, error: nil, payload: response})
  end

  # cancel an appointment of a prospect on knock crm
  def cancel_appointment appointment_id, community_id, company_id
    url = "#{ENV["KNOCK_BASE_URL"]}/appointment/#{appointment_id}/cancel"

    response = HTTParty.put(url, headers: headers(community_id, company_id))

  rescue HTTParty::Error => e
    OpenStruct.new({success?: false, error: e, payload: nil})
  else
    OpenStruct.new({success?: true, error: nil, payload: response})
  end

  # get available time slots of a community
  def get_community_available_times self_guided, community_id, company_id
    url = "#{ENV["KNOCK_BASE_URL"]}/community/#{community_id}/available-times?forSelfGuided=#{self_guided}"

    response = HTTParty.get(url, headers: headers(community_id, company_id))

  rescue HTTParty::Error => e
    OpenStruct.new({success?: false, error: e, payload: nil})
  else
    OpenStruct.new({success?: true, error: nil, payload: response})
  end

   # get sources of a community
  def get_community_sources community_id, company_id
    url = "#{ENV["KNOCK_BASE_URL"]}/community/#{community_id}/sources"

    response = HTTParty.get(url, headers: headers(community_id, company_id))

  rescue HTTParty::Error => e
    OpenStruct.new({success?: false, error: e, payload: nil})
  else
    OpenStruct.new({success?: true, error: nil, payload: response})
  end

  # create a visit for a prospect
  def create_visit payload, community_id, company_id
    url = "#{ENV["KNOCK_BASE_URL"]}/visit"

    response = HTTParty.post(url, body: payload.to_json, headers: headers(community_id, company_id))

  rescue HTTParty::Error => e
    OpenStruct.new({success?: false, error: e, payload: nil})
  else
    OpenStruct.new({success?: true, error: nil, payload: response})
  end

  private

    def headers community_id, company_id
      {
        'Content-Type' => 'application/json',
        'company-id' => company_id,
        'property-id' => community_id
    }.merge!(api_key)
    end

    def api_key
      unless Rails.env.production?
        {'x-api-key' => ENV["KNOCK_API_KEY"]}
      else
        {'apikey' => ENV["KNOCK_API_KEY"]}
      end
    end
end
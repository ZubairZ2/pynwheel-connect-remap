class BaseService
  attr_accessor :credentials
  
  def initialize(hash)
    @credentials = OpenStruct.new(hash)
  end

  def evaluate_floor(marketing_name)
    marketing_name = marketing_name.gsub('-','')
    floor = 1
    
    if marketing_name.size == 3
      floor = marketing_name.first(1)
    elsif marketing_name.size > 3
      floor = marketing_name.first(2)
    end

    return floor 
  end

  def evaluate_building(marketing_name)
    marketing_name = marketing_name.gsub('-','')
    building = nil
    
    if marketing_name.size == 3
      building = marketing_name.first(1)
    elsif marketing_name.size > 3
      building = marketing_name.first(2)
    end

    return building.present? ? building&.to_i : nil
  end


  def sign_token_for_latch_request(request_hash, clientId, secretKey)
    request = OpenStruct.new(request_hash)
    header = { alg: "HS256", typ: "JWT", kid: clientId }

    payload = {
      method: request.type,
      host: request.host,
      aud: request.endpoint,
      nbf: DateTime.now.to_i,
      exp: (DateTime.now + 1.second).to_i,
      jti: SecureRandom.uuid
    }

    if request.body.present?
        payload[:body] = request.body
    end

    JWT.encode(payload, Base64.decode64(secretKey), 'HS256', header)
  end

  def image_base64(image_url)
    return unless image_url.present?

    encoded_url = URI::DEFAULT_PARSER.escape(image_url) #URI.encode(image_url)
    uri = URI.parse(encoded_url)
    file = uri.open
    image_data = file.read
    encoded_image = Base64.strict_encode64(image_data)
    "data:image/png;base64,#{encoded_image}"
  # rescue ::OpenURI::HTTPError => e
  #   raise e
  # rescue StandardError => e
    # raise e
  rescue
    ""
  end

  def add_or_update_sub_communities community, property_name, property_code
    sub = community.sub_communities.find_or_initialize_by(property_id: property_code&.strip)
    sub.assign_attributes(name: property_name)
    sub.save!
    
  rescue StandardError => e
    raise e
  end

  def yardi_rent_cafe_property_rent_matrix(property_code, limit_result)
    begin
      rent_matrix = get_property_pricing_details(property_code, limit_result)
      if rent_matrix.present?
        grouped = rent_matrix.group_by { |u| u["apartmentId"] }

        result = {}

        grouped.each do |apartment_id, listings|
          best_per_term = listings
            .group_by { |u| u["term"] }
            .values
            .map { |term_listings| term_listings.min_by { |u| u["rent"] } }

          result[apartment_id] = best_per_term.map do |u|
            [u["rent"], u["term"], u["start_Date"], u["end_Date"]]
          end
        end

        return result
      else
        return {}
      end
    rescue => ex
      raise ex
    end
  end
  
  def get_property_pricing_details property_code, limit_result
    DataProviders::RentCafe::V2ApisService.new(@credentials.community_id).get_apartment_pricing_matrix(property_code, limit_result)
  end
end

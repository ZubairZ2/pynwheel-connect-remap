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
    encoded_url = URI.encode(image_url)
    uri = URI.parse(encoded_url)
    file = uri.open
    image_data = file.read
    encoded_image = Base64.strict_encode64(image_data)
    "data:image/png;base64,#{encoded_image}"
  rescue OpenHTTP::Error => e
    Rails.logger.error("Error fetching image from URL: #{e.message}")
    nil
  rescue StandardError => e
    Rails.logger.error("Error processing image: #{e.message}")
    nil
  end
end

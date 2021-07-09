class JsonWebToken
  # @encryption_key = Rails.env.production? ? ENV['SECRET_KEY_BASE_v2'] : Rails.application.secrets.secret_key_base

  @encryption_key = ENV['SECRET_KEY_BASE_v2']

  def self.encode(payload)
    JWT.encode payload, @encryption_key
  end

  def self.decode(token)
    JWT.decode(token, @encryption_key).first
  end
end
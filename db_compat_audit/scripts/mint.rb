# EMAIL=someone@pynwheel.com bundle exec rails runner mint.rb   (local dev only)
# Prints one JSON line: the encrypted Rails session cookie for the given user.
user = User.find_by!(email: ENV.fetch('EMAIL'))
key  = Rails.application.config.session_options[:key] || '_pynwheel-cms_session'
env  = Rack::MockRequest.env_for('http://127.0.0.1:3000/').merge(Rails.application.env_config)
jar  = ActionDispatch::Request.new(env).cookie_jar
jar.encrypted[key] = { value: {
  'session_id' => SecureRandom.hex(16),
  'warden.user.user.key' => [[user.id], user.authenticatable_salt],
  'warden.user.user.session' => { 'last_request_at' => Time.now.to_i },
  '_csrf_token' => SecureRandom.base64(32) } }
puts JSON.generate(cookie_name: key, cookie_value: jar[key], user_id: user.id, role: user.role)

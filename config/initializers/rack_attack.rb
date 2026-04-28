class Rack::Attack
  throttle('notify-email/ip', limit: 10, period: 60) do |req|
    req.ip if req.path == '/api/notify-email' && req.post?
  end

  self.throttled_responder = lambda do |_req|
    [
      429,
      { 'Content-Type' => 'application/json' },
      [{ status: 'error', code: 'rate_limit_exceeded', message: 'Too many requests. Limit is 10 per minute.' }.to_json]
    ]
  end
end

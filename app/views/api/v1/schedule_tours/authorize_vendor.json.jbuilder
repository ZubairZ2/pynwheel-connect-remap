json.is_success true
json.status_code 200
json.message "You are authorized successfully"
json.data do
  json.token JsonWebToken.encode(sub: @api_access_key)
end
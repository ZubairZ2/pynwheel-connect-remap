json.status true
json.success_code 200
json.message "Pynwheel access user is verified successfully"
json.is_zerv_lock @zerv_present

json.zerv_credentials {
  json.username @zerv_present ? @pynwheel_access_user&.community&.zerv&.username : nil
  json.password @zerv_present ? @pynwheel_access_user&.community&.zerv&.password : nil
}

json.user_data {
  json.access_token @access_token
  json.id @pynwheel_access_user.id
  json.name @pynwheel_access_user.name
  json.first_name @pynwheel_access_user.first_name
  json.last_name @pynwheel_access_user.last_name
  json.email @pynwheel_access_user.email
  json.phone_number @pynwheel_access_user.phone_number
  json.user_type @pynwheel_access_user.user_type
  json.move_in_date @pynwheel_access_user.move_in_date
  json.move_out_date @pynwheel_access_user.move_out_date
  json.lease_in_date @pynwheel_access_user.lease_in_date
  json.lease_out_date @pynwheel_access_user.lease_out_date
  json.is_varified @pynwheel_access_user.is_verified
}
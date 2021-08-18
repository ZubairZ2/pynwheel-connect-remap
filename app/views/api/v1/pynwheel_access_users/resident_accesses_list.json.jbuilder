json.status true
json.success_code 200
json.message "Resident's accesses list"
json.community_logo (@pynwheel_access_user&.community&.logo&.url.present? ? @pynwheel_access_user.community.logo.url : asset_url("pynwheel-default-logo.png"))
json.resident_accesses_list @pynwheel_access_user.get_access_list()
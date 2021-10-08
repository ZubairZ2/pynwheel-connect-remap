json.status true
json.success_code 200
json.message "Resident's history data"
json.residen_stops_history @pynwheel_access_user.get_residents_access_history()

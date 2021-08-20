json.status true
json.success_code 200
json.message "Resident's history data"
# json.residen_stops_history @pynwheel_access_user.get_residents_access_history()
json.residen_stops_history [
  {
    stop_name: "Stop 1",
    acccess_time: Time.now.strftime("%a, %d %b %Y %I:%M %p"),
    message: "Successfully accessed",
    is_successful: true

  },
  {
    stop_name: "Stop 2",
    acccess_time: Time.now.strftime("%a, %d %b %Y %I:%M %p"),
    message: "Failed to access",
    is_successful: false
  }
]
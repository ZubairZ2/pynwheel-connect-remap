json.status true
json.success_code 200
json.message "Resident's history data"
json.residen_stops_history [
  {
    stop_name: "Stop 1",
    acccess_time: Time.now,
    message: "Successfully accessed",
    is_successful: true

  },
  {
    stop_name: "Stop 2",
    acccess_time: Time.now - 10.minutes,
    message: "Failed to access",
    is_successful: false
  }
]
json.status true
json.success_code 200
json.message "Resident's accesses list"
json.community_logo (@pynwheel_access_user&.community&.logo&.url.present? ? @pynwheel_access_user.community.logo.url : asset_url("pynwheel-default-logo.png"))
json.resident_accesses_list @pynwheel_access_user.get_access_list()

# json.resident_accesses_list [
#   {
#     stop_id: 1,
#     stop_name: "Stop 1",
#     stop_type: "unit",
#     lock_type: "Dwelo",
#     last_access: Time.now - 5.minutes,
#     guest_pin: '',
#     latch_link: '',
#     unit_dwelo_lock_id: 123,
#     message: "Unlock the door"

#   },
#   {
#     stop_id: 2,
#     stop_name: "Stop 2",
#     stop_type: "amenity",
#     lock_type: "Latch",
#     last_access: Time.now - 10.minutes,
#     guest_pin: '',
#     latch_link: 'https://pynwheelconnect.com/',
#     unit_dwelo_lock_id: '',
#     message: "Unlock the door"

#   },
#   {
#     stop_id: 3,
#     stop_name: "Stop 3",
#     stop_type: "elevator",
#     lock_type: "EdgeState",
#     last_access: Time.now - 15.minutes,
#     guest_pin: '12345',
#     latch_link: '',
#     unit_dwelo_lock_id: '',
#     message: "Unlock the door"

#   },
#   {
#     stop_id: 4,
#     stop_name: "Stop 4",
#     stop_type: "building_starting_point",
#     lock_type: "Zerv",
#     last_access: Time.now - 20.minutes,
#     guest_pin: 'Your tour has started. The door will automatically unlock when your mobile device is within range. Enjoy your tour!',
#     latch_link: '',
#     unit_dwelo_lock_id: '',
#     message: "Unlock the door"

#   },
#   {
#     stop_id: 5,
#     stop_name: "Stop 5",
#     stop_type: "unit",
#     lock_type: "Manual",
#     last_access: Time.now - 20.minutes,
#     guest_pin: '12345',
#     latch_link: '',
#     unit_dwelo_lock_id: '',
#     message: "Unlock the door"
#   }


# ]
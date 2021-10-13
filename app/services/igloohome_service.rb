class IgloohomeService < BaseService
  include AllowedTourStopsHelper
  def initialize community, current_time, tour_user
    @community = community
    @current_time = current_time
    @tour_user = tour_user
  end

  def assign_guest_bluetooth_key
    allowed_stops = igloohome_allowed_stops(@community)
    igloohome = @community.igloohome
    igloohome_locks = IgloohomeLock.where(igloohome_id: @community&.igloohome&.id, stop_id: allowed_stops)
    get_igloohome_locks_guest_key(igloohome_locks) if igloohome_locks.present?
  end

  private

  def update_igloohome_guest_key_pin response, lock
    if response.success? && response["payload"].present? && response["payload"]["bluetoothGuestKey"].present? && response["payload"]["keyId"].present?
      igloohome_guests = @tour_user.igloohome_guests.where(community_id: @community.id, stop_id: lock.stop_id, stop_type: lock.stop_type)
    
      guest_pin = "12345" #get_guest_pin(lock)

      if guest_pin.present?
        if igloohome_guests.present? && igloohome_guests.last.present?
          update_igloohome_guest(igloohome_guests.last, response, guest_pin)
        else
          create_gloohome_guest(lock, response, guest_pin)
        end
      end
    end
  end

  def get_guest_pin lock
    response = get_device_guest_pin(lock)
    if response.success? && response["payload"].present? && response["payload"]["pin"].present?
      response["payload"]["pin"]
    else
      nil
    end
  end

  def update_igloohome_guest igloohome_guest, response, guest_pin
    igloohome_guest.update!(guest_pin: guest_pin, guest_bluetooth_key: response["payload"]["bluetoothGuestKey"], guest_key: response["payload"]["keyId"])
  end

  def create_gloohome_guest lock, response, guest_pin
    IgloohomeGuest.create!(guest_pin: guest_pin, tour_user_id: @tour_user.id, community_id: @community.id, stop_id: lock.stop_id, stop_type: lock.stop_type, guest_bluetooth_key: response["payload"]["bluetoothGuestKey"], guest_key: response["payload"]["keyId"])
  end

  def get_igloohome_locks_guest_key igloohome_locks
    igloohome_locks.each do |lock|
      if lock.device_id.present?
        response = get_device_bluetooth_key(lock)
        update_igloohome_guest_key_pin(response, lock)
      end
    end
  end

  def get_device_bluetooth_key lock
    url = "#{ENV["IGLOOHOME_API_BASE_URL"]}/v2/locks/#{lock.device_id}/ekeys"

    response = HTTParty.post(url,
      body: {
        startDate: @current_time,
        endDate: @current_time + 90.minutes,
        permissions: get_igloohome_permisions
      }.to_json,
      headers: { 
        'Content-Type' => 'application/json',
        'X-IGLOOCOMPANY-APIKEY' => ENV["IGLOOHOME_API_KEY"]
      })

  rescue HTTParty::Error => e
    OpenStruct.new({success?: false, error: e, payload: nil})
  else
    OpenStruct.new({success?: true, error: nil, payload: response})
  end

  def get_device_guest_pin lock
    url = "#{ENV["IGLOOHOME_API_BASE_URL"]}/v2/locks/#{lock.device_id}/pin/hourly"
    response = HTTParty.post(url,
      body: {
        startDate:@current_time.change({ min: 0 }).iso8601,
        endDate: (@current_time + 120.minutes).change({ min: 0 }).iso8601,
        variance: 3
      }.to_json,
      headers: { 
        'Content-Type' => 'application/json',
        'X-IGLOOCOMPANY-APIKEY' => ENV["IGLOOHOME_API_KEY"]
      })

  rescue HTTParty::Error => e
    OpenStruct.new({success?: false, error: e, payload: nil})
  else
    OpenStruct.new({success?: true, error: nil, payload: response})
  end

  def get_igloohome_permisions
    [
      "UNLOCK",
      "SET_TIME",
      "GET_TIME",
      "GET_BATTERY_LEVEL",
      "GET_LOCK_STATUS",
      "SET_VOLUME",
      "RESET_LOCK",
      "SET_AUTORELOCK",
      "SET_MAX_INCORRECT_PINS",
      "GET_LOGS",
      "CREATE_PIN",
      "EDIT_PIN",
      "DELETE_PIN",
      "SET_MASTER_PIN",
      "LOCK",
      "ENABLE_AUTOUNLOCK",
      "BLACKLIST_GUEST_KEY",
      "UNBLACKLIST_GUEST_KEY",
      "ENABLE_DFU",
      "SET_DAYLIGHT_SAVINGS",
      "ADD_CARD",
      "DELETE_CARD",
      "SET_BRIGHTNESS"
    ]
  end
end
class PynwheelAccessUser < ApplicationRecord
  enum user_type: [ :resident, :staff ]

  belongs_to :community
  has_many :resident_access_points, dependent: :destroy

  has_many :as_guests, dependent: :destroy
  has_many :igloo_guests, dependent: :destroy
  has_many :latch_guests, dependent: :destroy

  after_create :assign_common_access_points

  def assign_common_access_points
    plotted_amenities = self.community.amenities.where("x_plot + y_plot > ?", 0).collect {|amenity| {access_point_id: amenity.id, access_point_type: "amenity"} }
    self.resident_access_points.create(plotted_amenities)
  end

  def get_access_list accesses_list = [], access_hash = {}
    user_accesses = get_access_points

    user_accesses.each do |access|
      access_point = (access[0].classify.constantize.find_by_id access[1])
      accesses_list << generate_access_hash(access_point, access[0])
    end

    accesses_list
  end

  def get_community_logo
    (self.community.logo.present? ? self.community.logo.url : asset_url("pynwheel-default-logo.png"))
  end

  private

  def generate_access_hash access, type

    {
      stop_id: access.id,
      stop_name: (type === "unit" ? "Unit: #{access.marketing_name}" : access.name),
      stop_type: type,
      lock_type: access.lock_provider,
      last_access: Time.now.strftime("%a, %d %b %Y %I:%M %p"),
    }.merge(lock_provider_data(access, type))
  end

  def lock_provider_data access, type
    case access.lock_provider
    when "Dwelo"
      get_dwelo_lock_data(access)
    when "Latch"
      get_latch_lock_data(access)
    when "EdgeState"
      get_edgestate_lock_data(access)
    when "Zerv"
      get_zerv_lock_data(access)
    when "Manual"
      get_manual_lock_data(access)
    else
      default_empty_locks_json
    end
  end

  def get_zerv_lock_data access_stop
    default_empty_locks_json
  end

  def get_latch_lock_data access_stop
    lch = LatchLock.find_by(latch_id: self.community.latch.id, stop_id: access_stop.id) if self.community.latch.present?

    if lch.present?
      latch_guest = self.latch_guests.find_by(community_id: self.community.id, guest_of_stop_id: access_stop.id, status: "active")
      latch_guest.present? ? latch_lock_access_link(latch_guest.latch_link) : default_empty_locks_json

    else
      default_empty_locks_json
    end
  end

  def get_manual_lock_data access_stop
    if access_stop.access_code.present?
      manual_lock_access_code(access_stop.access_code)
    else
      default_empty_locks_json
    end
  end

  def get_dwelo_lock_data access_stop
    dwelo_lock = access_stop.remote_locks.where.not(dwelo_id: nil).last rescue nil
    if dwelo_lock.present? && dwelo_lock.device_id.present?
      dwelo_device_id(dwelo_lock)
    else
      default_empty_locks_json
    end
  end

  def get_edgestate_lock_data access_stop
    rml = RemoteLock.find_by(edge_state_id: self.community.edge_state.id , stop_id: access_stop.id) if self.community.edge_state.present?
    
    if rml.present?
      if self.as_guests.find_by(community_id: self.community.id).present?
        igloo_guest = IglooGuest.find_by(stop_id: access_stop.id, pynwheel_access_user_id: self.id, status: "active")
        
        if igloo_guest.nil?
          pin = self.as_guests.find_by(community_id: self.community.id).edgestate_pin if self.as_guests.find_by(community_id: self.community.id).present?
          if pin.present? && rml.remote_lock_type != "igloo_lock"
            edestate_lock_pin(pin)
          else
            default_empty_locks_json
          end
        else
          if igloo_guest.guest_code.present?
            igloo_lock_guest_code(igloo_guest.guest_code) 
          else
            default_empty_locks_json
          end
        end

      else
        default_empty_locks_json
      end
    else
      default_empty_locks_json
    end
  end

  def latch_lock_access_link link
    {
      guest_pin: '',
      latch_link: link,
      unit_dwelo_lock_id: '',
      is_igloo_lock: false,
      message: "Please use given latch lock access link to unlock the door",
    }
  end

  def manual_lock_access_code code 
    {
      guest_pin: code,
      latch_link: '',
      unit_dwelo_lock_id: '',
      is_igloo_lock: false,
      message: "Please use given manual lock access code to unlock the door",
    }
  end

  def igloo_lock_guest_code code
    {
      guest_pin: code,
      latch_link: '',
      unit_dwelo_lock_id: '',
      is_igloo_lock: true,
      message: "Please use given edgestate lock pin to unlock the door",
    }
  end

  def edestate_lock_pin pin
    {
      guest_pin: pin,
      latch_link: '',
      unit_dwelo_lock_id: '',
      is_igloo_lock: false,
      message: "Please use given edgestate lock pin to unlock the door",
    }
  end

  def dwelo_device_id lock
    {
      guest_pin: '',
      latch_link: '',
      unit_dwelo_lock_id: lock.device_id,
      is_igloo_lock: false,
      message: "Please use given dwelo lock Id to unlock the door",
    }
  end

  def default_empty_locks_json
    {
      guest_pin: '',
      latch_link: '',
      unit_dwelo_lock_id: '',
      is_igloo_lock: false,
      message: "No lock",
    }
  end

  def get_access_points
    self.resident_access_points.pluck(:access_point_type, :access_point_id)
  end
end

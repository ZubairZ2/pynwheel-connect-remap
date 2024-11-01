class PynwheelAccessUser < ApplicationRecord
  enum :user_type, [ :resident, :staff ]

  belongs_to :community
  has_many :resident_access_points, dependent: :destroy

  has_many :as_guests, dependent: :destroy
  has_many :igloo_guests, dependent: :destroy
  has_many :latch_guests, dependent: :destroy
  has_many :zerv_guests, dependent: :destroy
  has_many :igloohome_guests

  after_create :assign_common_access_points

  def assign_common_access_points
    plotted_amenities = self.community.amenities.where("x_plot + y_plot > ?", 0).collect {|amenity| {access_point_id: amenity.id, access_point_type: "amenity"} }
    self.resident_access_points.create(plotted_amenities)
  end

  def get_residents_access_history
    stops = self.resident_access_points.where.not(access_time: nil)
    access_history = []

    stops.each do |s|
      access_point = (s.access_point_type.classify.constantize.find_by_id s.access_point_id)
      access_history << access_history_json(access_point, s)
    end

    access_history
  end

  def access_history_json access_point, stop
    {
      stop_name: (stop.access_point_type === "unit" ? "Unit: #{access_point.marketing_name}" : access_point.name),
      acccess_time: current_community_time(stop.access_time),
      message: stop.is_accessed ? "Successfully accessed" : "Failed to access",
      is_successful: stop.is_accessed
    }
  end

  def get_access_list accesses_list = [], access_hash = {}
    user_accesses = get_access_points

    user_accesses.each do |access|
      access_point = (access.access_point_type.classify.constantize.find_by_id access.access_point_id)
      if access_point.lock_provider.present?
        accesses_list << generate_access_hash(access_point, access)
      end
    end

    accesses_list
  end

  def get_community_logo
    (self.community.logo.present? ? self.community.logo.url : asset_url("pynwheel-default-logo.png"))
  end

  private

  def current_community_time(access_time)
    community = self.community
    timezone = community.get_time_zone()
    access_time.in_time_zone(timezone).strftime("%a, %d %b %Y %I:%M %p")
  end

  def generate_access_hash access, stop
    {
      stop_id: access.id,
      stop_name: (stop.access_point_type === "unit" ? "Unit: #{access.marketing_name}" : access.name),
      stop_type: stop.access_point_type,
      lock_type: access.lock_provider,
      last_access: stop.access_time.present? ? current_community_time(stop.access_time) : "Never",
    }.merge(lock_provider_data(access, stop.access_point_type))
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
      get_zerv_lock_data(access, type)
    when "Manual"
      get_manual_lock_data(access)
    else
      default_empty_locks_json
    end
  end

  def get_zerv_lock_data access_stop, type
    zrv = ZervLock.find_by(zerv_id: self.community.zerv.id, stop_type: type.camelcase, stop_id: access_stop.id) if self.community.zerv.present?
    
    if zrv.present?
      zrv_guest = self.zerv_guests.find_by(community_id: self.community.id, guest_of_stop_type: type.camelcase, guest_of_stop_id: access_stop.id, status: "active")
      
      if zrv_guest.present?
        zerv_lock_access_pin('Tap the unlock button below when you are near the fob reader')
      else
        zrv_guest = self.zerv_guests.find_by(community_id: self.community.id, status: "active")
        
        if zrv_guest.present?
          zerv_lock_access_pin(zrv_guest.res_errors.nil? ? '' : zrv_guest.res_errors["error_position"])
        else
          default_empty_locks_json
        end
      end
    else
      default_empty_locks_json
    end
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
    rml = RemoteLock.where(edge_state_id: self.community.edge_state.id , stop_id: access_stop.id).last if self.community.edge_state.present?
    
    if rml.present?
      if self.as_guests.where(community_id: self.community.id).present?
        igloo_guest = IglooGuest.where(stop_id: access_stop.id, pynwheel_access_user_id: self.id, status: "active").last
        
        if igloo_guest.nil?
          pin = self.as_guests.where(community_id: self.community.id).last.edgestate_pin
          
          if pin.present? && rml.remote_lock_type != "igloo_lock"
            edestate_lock_pin(pin)
          else
            default_empty_locks_json
            # temp_igloo_lock
          end
        else
          if igloo_guest.guest_code.present?
            igloo_lock_guest_code(igloo_guest.guest_code) 
          else
            default_empty_locks_json
            # temp_igloo_lock
          end
        end

      else
        default_empty_locks_json
      end
    else
      default_empty_locks_json
    end
  end

  def temp_igloo_lock 
    {
      guest_pin: '',
      latch_link: '',
      unit_dwelo_lock_id: '',
      is_igloo_lock: true,
      message: "Please use given igloo lock pin to unlock the door ",
    }
  end

  def zerv_lock_access_pin msg
    {
      guest_pin: '',
      latch_link: '',
      unit_dwelo_lock_id: '',
      is_igloo_lock: false,
      message: msg,
    }
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
    self.resident_access_points
  end
end

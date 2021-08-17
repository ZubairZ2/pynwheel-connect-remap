class PynwheelAccessUser < ApplicationRecord
  enum user_type: [ :resident, :staff ]

  belongs_to :community
  has_many :resident_access_points, dependent: :destroy
  has_many :as_guests, dependent: :destroy

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
      {}
    when "EdgeState"
      {}
    when "Zerv"
      {}
    when "Manual"
      {}
    else
      {}
    end
  end

  def get_dwelo_lock_data access_stop
    dwelo_lock = access_stop.remote_locks.where.not(dwelo_id: nil).last rescue nil
    {
      guest_pin: '',
      latch_link: '',
      unit_dwelo_lock_id: dwelo_lock.device_id,
      message: "Please use given dwelo lock Id to unlock the lock",
    }
  end


  def get_access_points
    self.resident_access_points.pluck(:access_point_type, :access_point_id)
  end
end

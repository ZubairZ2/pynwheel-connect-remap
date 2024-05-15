class Igloohome < ApplicationRecord
  require 'csv'

  belongs_to :community
  has_many :igloohome_locks, dependent: :destroy
  mount_uploader :file, CsvfileUploader
  has_one :status, as: :statusable
  mount_base64_uploader :lock_image, AvatarUploader

  def as_json options = {}
    super(
      :only => [:id, :community_id, :client_id, :client_secret, :home_name],
      :methods => [:is_client_auth, :is_auth_code, :authenticated_with_pynwheel, :redirect_uri]
    )
  end

  def map_locks_with_stops
    MapLocksJob.perform_async(community, "Igloohome")
  end

  def redirect_uri
    "https://auth.igloohome.co/login?client_id=#{ENV['PYNWHEEL_IGLOOHOME_CLIENT_ID']}&response_type=code&redirect_uri=https%3A%2F%2Fpynwheelconnect.com&scope=igloohomeapi%2Falgopin-daily+igloohomeapi%2Falgopin-hourly+igloohomeapi%2Falgopin-onetime+igloohomeapi%2Falgopin-permanent+igloohomeapi%2Fcreate-pin-bridge-proxied-job+igloohomeapi%2Fdelete-pin-bridge-proxied-job+igloohomeapi%2Fget-devices+igloohomeapi%2Fget-job-status+igloohomeapi%2Flock-bridge-proxied-job+igloohomeapi%2Funlock-bridge-proxied-job+igloohomeapi%2Fget-master-pin+igloohomeapi%2Fget-properties+openid+profile"
  end

  def access_token_expired?
    access_token.nil? || Time.now >= access_token_expiry
  end

  def refresh_token_expired?
    refresh_token.nil? || Time.now >= refresh_token_expiry
  end
  
  def is_client_auth
    client_id && client_secret && !is_authorized_with_pynwheel
  end

  def is_auth_code
    return true if !is_client_auth && !is_code_authorized
    is_code_authorized
  end

  def is_code_authorized
    (is_authorized_with_pynwheel || !(client_id && client_secret).present?) && !refresh_token_expired?
  end

  def authenticated_with_pynwheel
    !refresh_token_expired?
  end

  def import_data file
    if file.path.split('.').last.include?("csv")
      CSV.foreach(file.path, headers: true) do |row|
        save_lock_info(row) if self.community.present?
      end
    end
  end

  def save_lock_info lock_row
    igloohome_lock = self.igloohome_locks.find_by(device_id: lock_row[1]) if lock_row[1].present?
    
    unless igloohome_lock.present?
      self.igloohome_locks.create!(device_name: lock_row[0], device_id: lock_row[1]) if lock_row[0].present? && lock_row[1].present?
    end
  end

  def map_locks_with_stops
    MapLocksJob.perform_async community, "Igloohome"
  end
end
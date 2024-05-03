class Igloohome < ApplicationRecord
  require 'csv'

  belongs_to :community
  has_many :igloohome_locks, dependent: :destroy
  mount_uploader :file, CsvfileUploader
  has_one :status, as: :statusable
  mount_base64_uploader :lock_image, AvatarUploader
  # mount_uploader :file, SchlagelockUploader

  def as_json options = {}
    super(
      :only => [:id, :community_id, :client_id, :client_secret],
      :methods => [:is_client_auth, :is_auth_code]
      
    )
  end

  def is_client_auth
    client_id && client_secret && !is_authorized_with_pynwheel
  end

  def is_auth_code
    is_authorized_with_pynwheel
  end

  def import_data file
    if file.path.split('.').last.include?("csv")
      CSV.foreach(file.path, headers: true) do |row|
        save_lock_info(row) if self.community.present?
      end
    end
  end

  private

  def save_lock_info lock_row
    igloohome_lock = self.igloohome_locks.find_by(device_id: lock_row[1]) if lock_row[1].present?
    
    unless igloohome_lock.present?
      self.igloohome_locks.create!(device_name: lock_row[0], device_id: lock_row[1]) if lock_row[0].present? && lock_row[1].present?
    end
  end

  def map_locks_with_stops
    MapLocksJob.perform_async community, "Igloohome"
  end

  def self.active_client_credential_igloohome(igloohome)
    !igloohome.present? || (igloohome and igloohome.client_id and igloohome.client_secret).present? ||
    (igloohome and !igloohome.client_id and !igloohome.client_secret and !igloohome.refresh_token).present? rescue false
  end

  def self.active_code_grant_auth(igloohome)
    (igloohome.present? and igloohome.is_authorized_with_pynwheel == true) || 
    (igloohome and igloohome.refresh_token && !igloohome.client_id and !igloohome.client_secret).present? rescue false
  end
end
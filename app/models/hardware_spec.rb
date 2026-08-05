class HardwareSpec < ApplicationRecord
  mount_base64_uploader :image, AvatarUploader

  belongs_to :community
  include LaunchStatusable

  def as_json options = {}
    super(:only => [:id, :name, :phone, :image])
  end

  # Launch: installation details are complete once we have a contact and a site photo.
  def derive_launch_status
    launch_status_from(name.present? && phone.present? && image.present?)
  end
end

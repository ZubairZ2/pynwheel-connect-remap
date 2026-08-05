class DesignDirection < ApplicationRecord
  belongs_to :comunity
  mount_base64_uploader :image, AvatarUploader
  mount_base64_uploader :file, DesignUploader

  include LaunchStatusable

  def as_json options = {}
    super(
      :only => [:id, :image, :hex_colors, :direction, :additional_direction, :file]
    )
  end

  # Launch: the design direction form is complete once the reference artwork is in.
  def derive_launch_status
    launch_status_from(image&.url.present? || file&.url.present?)
  end
end

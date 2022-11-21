class DesignDirection < ApplicationRecord
  belongs_to :comunity
  mount_base64_uploader :image, AvatarUploader
  mount_base64_uploader :file, DesignUploader

  has_one :status, as: :statusable

  def as_json options = {}
    super(
      :only => [:id, :image, :hex_colors, :direction, :additional_direction, :file]
    )
  end
end

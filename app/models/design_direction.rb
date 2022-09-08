class DesignDirection < ApplicationRecord
  belongs_to :comunity
  mount_base64_uploader :image, AvatarUploader
  has_one :status, as: :statusable

  def as_json
    super(
      :only => [:id, :image, :hex_colors, :direction, :additional_direction]
    )
  end
end

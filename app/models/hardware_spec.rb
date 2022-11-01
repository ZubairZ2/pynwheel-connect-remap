class HardwareSpec < ApplicationRecord
  mount_base64_uploader :image, AvatarUploader

  belongs_to :community
  has_one :status, as: :statusable

  def as_json options = {}
    super(:only => [:id, :name, :phone, :image])
  end
end

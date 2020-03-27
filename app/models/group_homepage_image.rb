class GroupHomepageImage < ApplicationRecord
  belongs_to :group_design
  mount_uploader :image, ImageUploader
  before_create :set_image_name


  def set_image_name
    self.name = image.file.filename if image.present?
  end
end

class HomepageIcon < ApplicationRecord
  include RailsSortable::Model
  set_sortable :sort  
  #mount_base64_uploader :image, ImageUploader
  mount_uploader :image, ImageUploader
  belongs_to :design
  before_create :set_image_name
  after_update :crop_image

  def crop_image
    image.recreate_versions! if crop_x.present?
  end

  def set_image_name
  	self.name = image.file.filename
  end
end

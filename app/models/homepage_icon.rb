# == Schema Information
#
# Table name: homepage_icons
#
#  id         :integer          not null, primary key
#  image      :string
#  name       :string
#  sort       :integer
#  design_id  :integer
#  crop_x     :float
#  crop_y     :float
#  crop_w     :float
#  crop_h     :float
#  created_at :datetime         not null
#  updated_at :datetime         not null
#

class HomepageIcon < ApplicationRecord
  has_paper_trail
  include RailsSortable::Model
  set_sortable :sort  
  mount_base64_uploader :image, ImageUploader
  # mount_uploader :image, ImageUploader
  belongs_to :design
  before_create :set_image_name
  after_update :crop_image

  def crop_image
    image.recreate_versions! if crop_x.present?
  end

  def set_image_name
  	self.name = image.file.filename rescue ""
  end
end

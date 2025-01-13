# == Schema Information
#
# Table name: additional_images
#
#  id           :integer          not null, primary key
#  image        :string
#  sort         :integer
#  name         :string
#  imagepage_id :integer
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  crop_x       :float
#  crop_y       :float
#  crop_w       :float
#  crop_h       :float
#  do_crop      :boolean          default(FALSE)
#

class AdditionalImage < ApplicationRecord
	include RailsSortable::Model
  belongs_to :imagepage
	has_one :status, as: :statusable
  set_sortable :sort  
	mount_uploader :image, AvatarUploader
	before_create :set_image_name
	after_update :crop_image, if: ->(obj) { obj.image_changed? }


	def crop_image
		image.recreate_versions! if (crop_x.present? && do_crop)
	end
	def set_image_name
  	self.name = image.file.filename
	end
end

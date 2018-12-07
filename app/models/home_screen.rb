# == Schema Information
#
# Table name: home_screens
#
#  id                  :integer          not null, primary key
#  appartments_button  :string
#  galleries_button    :string
#  neighborhood_button :string
#  favorities_button   :string
#  menu_position       :string
#  manage_background   :boolean
#  background_color    :string
#  design_id           :integer
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  about_button        :string
#  floorplan_button    :string
#  building_button     :string
#

class HomeScreen < ApplicationRecord
	mount_base64_uploader :appartments_button, AvatarUploader
	mount_base64_uploader :galleries_button, AvatarUploader
	mount_base64_uploader :neighborhood_button, AvatarUploader
	mount_base64_uploader :favorities_button, AvatarUploader
	mount_base64_uploader :about_button, AvatarUploader
	mount_base64_uploader :floorplan_button, AvatarUploader
	mount_base64_uploader :building_button, AvatarUploader
	belongs_to :design
end

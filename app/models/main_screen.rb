# == Schema Information
#
# Table name: main_screens
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
#

class MainScreen < ApplicationRecord
	mount_base64_uploader :appartments_button, AvatarUploader
	mount_base64_uploader :galleries_button, AvatarUploader
	mount_base64_uploader :neighborhood_button, AvatarUploader
	mount_base64_uploader :favorities_button, AvatarUploader
	belongs_to :design

	amoeba do
		enable
		customize(lambda { |original_object,new_object|
			new_object.appartments_button = original_object.appartments_button
			new_object.galleries_button = original_object.galleries_button
			new_object.neighborhood_button = original_object.neighborhood_button
			new_object.favorities_button = original_object.favorities_button
		})
	end
end

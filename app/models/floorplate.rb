class Floorplate < ApplicationRecord
	mount_uploader :image, AvatarUploader
	belongs_to :community
	has_many :units
	validates_uniqueness_of :name, scope: :community_id
	validates :image, :presence => {message: "can't be blank. Please upload Floor Plate image first."}
end

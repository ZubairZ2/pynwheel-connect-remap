class Floorplate < ApplicationRecord
	mount_uploader :image, SiteMapUploader
	belongs_to :community
	has_many :units
	has_many :amenities, as: :amenityable
	validates_uniqueness_of :name, scope: :community_id
	validates :image, :presence => {message: "cannot be blank. Please upload Floor Plate image first."}
end

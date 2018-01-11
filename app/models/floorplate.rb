class Floorplate < ApplicationRecord
	mount_uploader :image, SiteMapUploader
	belongs_to :community
	has_many :units
	has_many :amenities, as: :amenityable
	validates_uniqueness_of :name, scope: :community_id
	validates_uniqueness_of :number, scope: :community_id
	validates :image, :presence => {message: "cannot be blank. Please upload Floor Plate image first."}
	before_destroy :reset_units_plots

	def reset_units_plots
		self.units.update_all(x_plot: 0,y_plot: 0, floorplate_id: nil)
	end
end

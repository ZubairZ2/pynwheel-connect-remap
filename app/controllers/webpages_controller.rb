class WebpagesController < ApplicationController
	def index
		#Unit.joins("LEFT OUTER JOIN floorplans ON floorplans.provider_floorplan_id = units.floorplan_id")
		@units = current_community.units.to_json
		units = current_community.units
		units.each do |u|
			puts '--***************************' , u.floorplan_id
		end
		@floorplan_ids = units.collect{|u| u.floorplan_id}
		puts '--------------------------' , @floorplan_ids
	end
end
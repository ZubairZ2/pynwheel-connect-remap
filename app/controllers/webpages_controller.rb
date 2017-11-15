class WebpagesController < ApplicationController
	layout false

	def index
#<<<<<<< HEAD
		@community = Community.find params[:community_id]
		@units = current_community.units
#=======
		@units_with_floorplan_info = []
		@units = Unit.joins("LEFT OUTER JOIN floorplans ON floorplans.provider_floorplan_id = units.floorplan_id").where(community_id: current_community.id)
		@units.each do |unit|
			if unit.floorplan.market_rent > 1
				struct = {
					market_rent: unit.floorplan.market_rent,
					bedrooms: unit.floorplan.bedrooms,
					bathrooms: unit.floorplan.bathrooms,
					square_feet: unit.floorplan.square_feet,
					availability: unit.availability,
					available_date: unit.available_date
				}
				@units_with_floorplan_info << struct
		    end
		end
		maximum_square_feet = @units_with_floorplan_info.max_by{|k| k[:square_feet] }[:square_feet]
		minimum_square_feet = @units_with_floorplan_info.min_by{|k| k[:square_feet] }[:square_feet]
		maximum_market_rent = @units_with_floorplan_info.max_by{|k| k[:market_rent] }[:market_rent]
		minimum_market_rent = @units_with_floorplan_info.min_by{|k| k[:market_rent] }[:market_rent]
		#puts '-------------------' , maximum_square_feet
		#puts '--------------------' , minimum_square_feet
		puts '*********************', maximum_market_rent
		puts '*********************' , minimum_market_rent
		square_feet_range = minimum_square_feet.to_i..maximum_square_feet.to_i
		square_feet_range_hash = square_feet_range.each_slice(square_feet_range.last/4).with_index.with_object({}) { |(a,i),h| h[a.first..a.last]=i }
		square_feet_range_hash = square_feet_range_hash.invert
		square_feet_range_hash.each do |v|
			puts '----------------------' , v[1].to_s.gsub("..","-")
		end
        @units_with_floorplan_info = @units_with_floorplan_info.to_json 
#>>>>>>> 6008262a8347b8fe0c60a5162748dbbff343f6f1
	end
end
class WebpagesController < ActionController::Base
	before_action :set_community
	# layout false

	def index
		@units_with_floorplan_info = []
		if @community.has_floorplates?
		  @floorplate = params[:floorplate_number].present? ? @community.floorplates.find_by_number(params[:floorplate_number]) : @community.floorplates.first
		  @units =  @floorplate.units.joins("LEFT OUTER JOIN floorplans ON floorplans.provider_floorplan_id = units.floorplan_id").available_units
		  @amenities = @floorplate.amenities
		else
      @units = @community.units.joins("LEFT OUTER JOIN floorplans ON floorplans.provider_floorplan_id = units.floorplan_id").available_units
		  @amenities = @community.sitemap.amenities if @community.sitemap.present?
		end
		if @units.size > 0
			normalize_units
			build_square_feet_range
			build_market_rent_range
    	@units_with_floorplan_info = @units_with_floorplan_info.to_json
    end
    # else
    #   flash[:error] = "Please plot units first."
    #   # redirect_to root_path
    # end 
	end

	def normalize_units
		@units.each do |unit|
			if unit.floorplan.present? && unit.floorplan.market_rent > 1
				struct = {
					marketing_name: unit.marketing_name,
					market_rent: unit.effective_rent,
					bedrooms: unit.floorplan.bedrooms,
					bathrooms: unit.floorplan.bathrooms,
					square_feet: unit.floorplan.square_feet,
					availability: unit.availability,
					available_date: unit.available_date
				}
				@units_with_floorplan_info << struct
	    end
		end
	end

	def build_square_feet_range
		maximum_square_feet = @units_with_floorplan_info.max_by{|k| k[:square_feet] }[:square_feet]
		minimum_square_feet = @units_with_floorplan_info.min_by{|k| k[:square_feet] }[:square_feet]
		@square_feet = []
		square_feet_range = minimum_square_feet.to_i..maximum_square_feet.to_i
		square_feet_range_hash = square_feet_range.each_slice(square_feet_range.last/4).with_index.with_object({}) { |(a,i),h| h[a.first..a.last]=i }
		square_feet_range_hash = square_feet_range_hash.invert
		square_feet_range_hash.each do |v|
			@square_feet << v[1].to_s.gsub("..","-")
		end
	end

	def build_market_rent_range
		maximum_market_rent = @units_with_floorplan_info.max_by{|k| k[:market_rent] }[:market_rent]
		minimum_market_rent = @units_with_floorplan_info.min_by{|k| k[:market_rent] }[:market_rent]
	    
		@market_rent = []
		market_rent_range = minimum_market_rent.to_i..maximum_market_rent.to_i
		market_rent_range_hash = market_rent_range.each_slice(market_rent_range.last/4).with_index.with_object({}) { |(a,i),h| h[a.first..a.last]=i }
		market_rent_range_hash = market_rent_range_hash.invert
		market_rent_range_hash.each do |v|
			@market_rent << v[1].to_s.gsub("..","-")
		end
	end

	private

	def set_community
		@community = Community.find(params[:community_id])
	end
end
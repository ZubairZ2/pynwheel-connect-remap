class WebpagesController < ActionController::Base
	before_action :set_community
	# layout false

	def index
		#cookies[:favorite_unit_ids] = nil
		#puts '-----------------------', cookies[:favorite_unit_ids].class
		@floorplans = []
		if cookies[:favorite_unit_ids] == nil
			cookies.permanent[:favorite_unit_ids] = JSON.generate([]) 
			cookies.permanent[:session_id] = SecureRandom.hex(8)
			Favorite.create(session_id: cookies[:session_id],unit_ids: [])
		end
		@units_with_floorplan_info = []
		#@units =  @community.units.joins("LEFT OUTER JOIN floorplans ON floorplans.community_id = units.community_id and floorplans.provider_floorplan_id = units.floorplan_id").available_units
		@community_info = Community.includes(:credential,:floorplans,{sitemap: [:amenities]},{floorplates: [:amenities]},{units: [:floorplate]}).find(params[:community_id])
		#@units = @community_info.units
		@units_in_xy_group = @community.units.available_units.select(:x_plot,:y_plot).group(:x_plot,:y_plot).size
	
		if @community_info.floorplates.present?
		  #!@floorplate = @community.floorplates.order('number ASC').first
		  #@amenities = @community.floorplates.joins(:amenities).collect{|c| c.amenities}
		  #!@amenities =  @community.floorplates.joins("LEFT OUTER JOIN amenities ON amenities.amenityable_id = floorplates.id").collect{|c| c.amenities}
		  #!@amenities = @amenities.flatten
		  #!@floorplate_numbers = @community.floorplates.map(&:number) 
		  @floorplates = @community_info.floorplates
      @sorted_floorplates = @floorplates.sort_by { |f| -f.number }
      @floorplate = @sorted_floorplates.first
      @floorplate_numbers = @sorted_floorplates.map(&:number)
      @amenities = @sorted_floorplates.collect{|c| c.amenities}
      @amenities = @amenities.flatten
		else
	    #@units = @community.units.joins("LEFT OUTER JOIN floorplans ON floorplans.provider_floorplan_id = units.floorplan_id").available_units
	    @amenities = @community_info.sitemap.amenities if @community.sitemap.present?
		end
		if @community_info.units.available_units.size > 0
			normalize_units
			if @units_with_floorplan_info.present?
				build_square_feet_range
				build_market_rent_range
	    	@units_with_floorplan_info = @units_with_floorplan_info.to_json
	    end
    end
	end

	def normalize_units
		@floorplans = @community_info.floorplans
		@community_info.units.available_units.each do |unit|
			#!if unit.floorplan.present? && unit.effective_rent >= 1 && (unit.x_plot > 0 || unit.y_plot > 0)
			# if (unit.x_plot > 0 || unit.y_plot > 0) && unit.availability == "Unoccupied" && unit.effective_rent >= 1 && @floorplans.any?{|f| f.provider_floorplan_id == unit.floorplan_id}
			if unit.effective_rent.present? && unit.effective_rent >= 1 && @floorplans.any?{|f| f.provider_floorplan_id == unit.floorplan_id}
				floorplan = @floorplans.select{|f| f.provider_floorplan_id == unit.floorplan_id}.first
				struct = {
					 marketing_name: unit.marketing_name,
					 market_rent: unit.effective_rent,
					 bedrooms: floorplan.bedrooms,
					 bathrooms: floorplan.bathrooms,
					 square_feet: floorplan.square_feet,
					 availability: unit.availability,
					 available_date: unit.available_date,
					 floorplate_number: (unit.floorplate.present? ? unit.floorplate.number : 0)
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
		square_feet_range_hash = square_feet_range.each_slice((square_feet_range.last/4 > 0 ? square_feet_range.last/4 : 1)).with_index.with_object({}) { |(a,i),h| h[a.first.to_i.to_s+'-'+maximum_square_feet.to_f.ceil.to_s]=a.first }
		square_feet_range_hash = square_feet_range_hash.invert
		square_feet_range_hash.each do |v|
			@square_feet << v
			# @square_feet << v[1].to_s.gsub("..","-")
		end
	end

	def build_market_rent_range
		maximum_market_rent = @units_with_floorplan_info.max_by{|k| k[:market_rent] }[:market_rent]
		minimum_market_rent = @units_with_floorplan_info.min_by{|k| k[:market_rent] }[:market_rent]
	    
		@market_rent = []
		market_rent_range = minimum_market_rent.to_i..maximum_market_rent.to_i
		# market_rent_range_hash = market_rent_range.each_slice(market_rent_range.last/4).with_index.with_object({}) { |(a,i),h| h[a.first.to_s+'-'+a.last.to_s]=a.last }
		market_rent_range_hash = market_rent_range.each_slice((market_rent_range.last/4 > 0 ? market_rent_range.last/4 : 1)).with_index.with_object({}) { |(a,i),h| h[minimum_market_rent.to_i.to_s+'-'+a.last.to_s]=a.last }
		market_rent_range_hash = market_rent_range_hash.invert
		market_rent_range_hash.each do |v|
			@market_rent << v
		end
	end

	def apply_now
		
	end

	def save_favorite
		array = JSON.parse(cookies[:favorite_unit_ids])
		@unit = Unit.find params[:unit_id]
		#@community.favorites.create(unit_id: params[:unit_id])
		array << params[:unit_id]
		cookies.permanent[:favorite_unit_ids] = JSON.generate(array)
		favorite = Favorite.find_by_session_id(cookies[:session_id]) 
		favorite.unit_ids << params[:unit_id]
		favorite.save
	end

	def delete_favorite
		array = JSON.parse(cookies[:favorite_unit_ids])
		@unit = Unit.find params[:unit_id]
		#@community.favorites.where(unit_id: params[:unit_id]).destroy_all
		array.delete params[:unit_id]
		cookies.permanent[:favorite_unit_ids] = JSON.generate(array) 
		favorite = Favorite.find_by_session_id(cookies[:session_id]) 
		favorite.unit_ids.delete params[:unit_id]
		favorite.save
	end

	def favorites
		@favorite = Favorite.find_by_session_id(cookies[:session_id])
		@units = Unit.where(id: JSON.parse(cookies[:favorite_unit_ids]))
		@floorplans = Floorplan.where(provider_floorplan_id: @units.map(&:floorplan_id),community_id: params[:community_id])
	end

	def favorites_share_link
		@favorite = Favorite.find_by_session_id(params[:session_id])
		@units = Unit.where(id: @favorite.unit_ids)
		@floorplans = Floorplan.where(provider_floorplan_id: @units.map(&:floorplan_id),community_id: params[:community_id])
	end

	def clear_favorites
		cookies.permanent[:favorite_unit_ids] = JSON.generate([]) 
		favorite = Favorite.find_by_session_id(cookies[:session_id]) 
		favorite.unit_ids = []
		favorite.save
		flash[:notice] = "Favorites cleared successfully."
		redirect_to :back
	end

	private

	def set_community
		@community = Community.find(params[:community_id])
	end
end
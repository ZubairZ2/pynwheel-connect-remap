class SitemapAmenitiesController < ApplicationController
	# include Error::ErrorHandler
	add_breadcrumb "Home", :root_path
	before_action :authenticate_user!
	before_action :check_community
	before_action :set_community_and_sitemap

	# def index
	# 	@sitemap = @community.sitemap
	# 	if @community.floorplates.present?
	# 		@floorplates = current_community.floorplates.order(id: :desc)
	# 	else
	#     @amenities = @sitemap.amenities.order(id: :desc)
	#     add_breadcrumb "Plot Property Map Units", plotexp_community_sitemaps_path
	#     add_breadcrumb "Amenities", community_sitemap_amenities_path(@community,@sitemap) 
	#   end
	# end

	# def new
	# 	@amenity = @community.sitemap.amenities.build
	# 	#add_breadcrumb "Property Map", map_community_sitemaps_path(@community)
	# 	add_breadcrumb "Amenities", community_sitemap_amenities_path(@community,@sitemap) 
 #    add_breadcrumb "Add Amenity","/communities/#{@community.id}/sitemaps/#{@sitemap.id}/amenities/new"
	# end

	# def edit
	# 	@amenity = @community.sitemap.amenities.find(params[:id])
	# 	add_breadcrumb "Property Map", map_community_sitemaps_path(@community)
	# 	add_breadcrumb "Amenities", community_sitemap_amenities_path(@community,@sitemap) 
 #    add_breadcrumb "Edit Amenity","/communities/#{@community.id}/sitemaps/#{@sitemap.id}/amenities/#{@amenity.id}/edit"
	# end

	# def create
	# 	@sitemap.amenities.create(image: params[:src],name: params[:name])
	# 	@amenities = @sitemap.amenities.order(id: :desc)
	# end

	# def update
	# 	@amenity = @community.sitemap.amenities.find(params[:id])
	# 	if @amenity.update_attributes(amenity_params)
	# 		redirect_to community_sitemap_amenities_path(@community,@sitemap), notice: "Amenity updated successfully"
	# 	else
	# 		add_breadcrumb "Amenities", community_sitemap_amenities_path(@community,@sitemap) 
 #      add_breadcrumb "Edit Amenity","/communities/#{@community.id}/sitemaps/#{@sitemap.id}/amenities/#{@amenity.id}/edit"
	# 		flash[:error] = @amenity.errors.full_messages.join(',')
 #      render :edit
	# 	end
	# end

	# def destroy
	# 	@amenity = @community.sitemap.amenities.find (params[:id])
	# 	if @amenity.destroy
	# 		redirect_to community_sitemap_amenities_path(@community,@sitemap), notice: "Amenity deleted successfully"
	# 	else
	# 		redirect_to community_sitemap_amenities_path(@community,@sitemap), error: @amenity.errors.full_messages.join(',')
	# 	end
	# end

	def plot_amenity
		@amenity = Amenity.find (params[:amenity_id])
		@amenity.amenityable_type = "Sitemap"

		if params[:x_plot].present? && params[:y_plot].present?
			@amenity.x_plot = params[:x_plot]
			@amenity.y_plot = params[:y_plot]
		end
		@amenity.pointer_data = if params[:pointer].present?
															x_plot, y_plot, tag, id, selector = params[:pointer].values_at(:x_plot, :y_plot, :tag, :id, :selector)
															{ x_plot: x_plot, y_plot: y_plot, tag: tag, id: id, selector: selector }
														else
															{}
														end
		ts = TourStop.find_by(stop_id: @amenity.id)
		if ts.present?
			ts.latitude  = @amenity.x_plot
			ts.longitude = @amenity.y_plot
			ts.save
		end

		if @amenity.save(validate: false)
			render json: { amenity: @amenity.attributes }, status: 200
	    else
	      render json: {}, status: 404
	    end
	end

	def plot_amenity_door                                # create or update
		amenity = @sitemap.amenities.find_by(id: params[:id])
		if amenity.present?
		  if params[:door_id].present? and params[:door_id].to_i != 0
			door = amenity.ordered_doors.find params[:door_id]
			status = "updated"
		  else
			door = amenity.ordered_doors.build
			status = "created"
		  end
		  door.update_attributes(community_id: @community.id, x_plot: params[:x_plot], y_plot: params[:y_plot])
		  render json: {amenity: amenity, door: door.reload, status: status, success: true}
		else
		  render json: {unit: {}, door: {}, status: nil, success: false}
		end
	end 

	def load_amenity_door_lock
		@amenity = @sitemap.amenities.find params[:id]
		@door = @amenity.ordered_doors.find params[:door_id]

		respond_to do |format|
			format.js { render :template => "floorplate_amenities/load_amenity_door_lock.js.erb" }
		end
	end

	def remove_amenities_plot
		svg_deletion = params[:svg_deletion].to_s == "true"
		new_attributes = svg_deletion ? { pointer_data: {} } : { x_plot: 0, y_plot: 0 }

		@community.amenities.each do |amenity|
			amenity.assign_attributes(new_attributes)
			amenity.save(validate: false)
			ts = TourStop.find_by(stop_id: amenity.id)
			if ts.present?
				VisitedStop.where(tour_stop_id: ts.id).destroy_all
				ts.destroy
			end
		end
		redirect_to plot_amenities_community_sitemaps_path(@community), notice: "All plots have been deleted successfully."
	end

	def remove_amenity
		@amenity = Amenity.find params[:id]
    amenities = @community.amenities

    svg_deletion = params[:svg_deletion].to_s == "true"
    new_attributes = svg_deletion ? { pointer_data: {} } : { x_plot: 0, y_plot: 0 }

    amenities = @amenity.filter_amenities_for_plot_removal(amenities, svg_deletion)
		amenities.each do |amenity|
      amenity.assign_attributes(new_attributes)
			amenity.save(validate: false)
			ts = TourStop.find_by(stop_id: amenity.id)
			if ts.present?
				VisitedStop.where(tour_stop_id: ts.id).destroy_all
				ts.destroy
			end
		end
		redirect_to plot_amenities_community_sitemaps_path(@community),notice: "Amenity plot have been deleted successfully."
	end

	private

	def set_community_and_sitemap
		@community = Community.find params[:community_id]
		@sitemap = @community.sitemap
	end

	def amenity_params
    params.require(:amenity).permit!
  end
end
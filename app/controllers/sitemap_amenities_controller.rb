class SitemapAmenitiesController < ApplicationController
	add_breadcrumb "Home", :root_path
	before_action :authenticate_user!
	before_action :set_community_and_sitemap

	def index
		@sitemap = @community.sitemap
		if @community.floorplates.present?
			@floorplates = current_community.floorplates.order(id: :desc)
		else
	    @amenities = @sitemap.amenities.order(id: :desc)
	    add_breadcrumb "Property Map", map_community_sitemaps_path(@community)
	    add_breadcrumb "Amenities", community_sitemap_amenities_path(@community,@sitemap) 
	  end
	end

	def new
		@amenity = @community.sitemap.amenities.build
		add_breadcrumb "Property Map", map_community_sitemaps_path(@community)
		add_breadcrumb "Amenities", community_sitemap_amenities_path(@community,@sitemap) 
    add_breadcrumb "Add Amenity","/communities/#{@community.id}/sitemaps/#{@sitemap.id}/amenities/new"
	end

	def edit
		@amenity = @community.sitemap.amenities.find(params[:id])
		add_breadcrumb "Property Map", map_community_sitemaps_path(@community)
		add_breadcrumb "Amenities", community_sitemap_amenities_path(@community,@sitemap) 
    add_breadcrumb "Edit Amenity","/communities/#{@community.id}/sitemaps/#{@sitemap.id}/amenities/#{@amenity.id}/edit"
	end

	def create
		@amenity = @community.sitemap.amenities.build(amenity_params)
		if @amenity.save
			redirect_to community_sitemap_amenities_path(@community,@sitemap), notice: "Amenity created successfully"
		else
			add_breadcrumb "Amenities", community_sitemap_amenities_path(@community,@sitemap) 
      add_breadcrumb "Add Amenity","/communities/#{@community.id}/sitemaps/#{@sitemap.id}/amenities/new"
			flash[:error] = @amenity.errors.full_messages.join(',')
      render :new
		end
	end

	def update
		@amenity = @community.sitemap.amenities.find(params[:id])
		if @amenity.update_attributes(amenity_params)
			redirect_to community_sitemap_amenities_path(@community,@sitemap), notice: "Amenity updated successfully"
		else
			add_breadcrumb "Amenities", community_sitemap_amenities_path(@community,@sitemap) 
      add_breadcrumb "Edit Amenity","/communities/#{@community.id}/sitemaps/#{@sitemap.id}/amenities/#{@amenity.id}/edit"
			flash[:error] = @amenity.errors.full_messages.join(',')
      render :edit
		end
	end

	def destroy
		@amenity = @community.sitemap.amenities.find (params[:id])
		if @amenity.destroy
			redirect_to community_sitemap_amenities_path(@community,@sitemap), notice: "Amenity deleted successfully"
		else
			redirect_to community_sitemap_amenities_path(@community,@sitemap), error: @amenity.errors.full_messages.join(',')
		end
	end

	def plot_amenity
		@amenity = @community.sitemap.amenities.find (params[:amenity_id])
		@amenity.x_plot = params[:x_plot]
		@amenity.y_plot = params[:y_plot]
		if @amenity.save(validate: false)
			render json: {amenity: @amenity}, status: 200
	    else
	      render json: {}, status: 404
	    end
	end

	def remove_amenities_plot
		@community.sitemap.amenities.each do |amenity|
			amenity.x_plot = 0
			amenity.y_plot = 0
			amenity.save(validate: false)
		end
		redirect_to plot_amenities_community_sitemaps_path(@community,@sitemap), notice: "All plots have been deleted successfully."
	end

	def remove_amenity
		@amenity = Amenity.find params[:id]
		amenities = @sitemap.amenities.where(x_plot: @amenity.x_plot, y_plot: @amenity.y_plot)
		amenities.each do |amenity|
			amenity.x_plot = 0
			amenity.y_plot = 0
			amenity.save(validate: false)
		end
		redirect_to plot_amenities_community_sitemaps_path(@community,@sitemap),notice: "Amenity plot have been deleted successfully."
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
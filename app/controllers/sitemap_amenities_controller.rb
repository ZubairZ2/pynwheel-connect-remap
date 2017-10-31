class SitemapAmenitiesController < ApplicationController
	before_action :authenticate_user!
	before_action :set_community_and_sitemap

	def index
		@sitemap = @community.sitemap
    @amenities = @sitemap.amenities
	end

	def new
		@amenity = @community.sitemap.amenities.build
	end

	def edit
		@amenity = @community.sitemap.amenities.find(params[:id])
	end

	def create
		@amenity = @community.sitemap.amenities.build(amenity_params)
		if @amenity.save
			redirect_to community_sitemap_amenities_path(@community,@sitemap), notice: "Amenity created successfully"
		else
			flash[:error] = @amenity.errors.full_messages.join(',')
            render :new
		end
	end

	def update
		@amenity = @community.sitemap.amenities.find(params[:id])
		if @amenity.update_attributes(amenity_params)
			redirect_to community_sitemap_amenities_path(@community,@sitemap), notice: "Amenity updated successfully"
		else
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

	private

	def set_community_and_sitemap
		@community = Community.find params[:community_id]
		@sitemap = @community.sitemap
	end

	def amenity_params
    params.require(:amenity).permit!
  end
end
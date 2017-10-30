class AmenitiesController < ApplicationController
	before_action :set_community_and_sitemap

	def new
		@amenity = @community.sitemap.amenities.build
	end

	def edit
		@amenity = @community.sitemap.amenities.find(params[:id])
	end

	def create
		@amenity = @community.sitemap.amenities.build(amenity_params)
		if @amenity.save
			redirect_to list_amenities_community_sitemaps_path(@community), notice: "Amenity created successfully"
		else
			flash[:error] = @amenity.errors.full_messages.join(',')
      render :new
		end
	end

	def update
		@amenity = @community.sitemap.amenities.find(params[:id])
		if @amenity.update_attributes(amenity_params)
			redirect_to list_amenities_community_sitemaps_path(@community), notice: "Amenity updated successfully"
		else
			flash[:error] = @amenity.errors.full_messages.join(',')
      render :edit
		end
	end

	def destroy
		@amenity = @community.sitemap.amenities.find (params[:id])
		if @amenity.destroy
			redirect_to list_amenities_community_sitemaps_path(@community), notice: "Amenity deleted successfully"
		else
			redirect_to list_amenities_community_sitemaps_path(@community), error: @amenity.errors.full_messages.join(',')
		end
	end

	private

	def set_community_and_sitemap
		@community = Community.find params[:community_id]
		@sitemap = @community.sitemap
	end

	def amenity_params
    params.require(:amenity).permit(:name,:image)
  end
end
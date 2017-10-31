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

	private

	def set_community_and_sitemap
		@community = Community.find params[:community_id]
		@sitemap = @community.sitemap
	end

	def amenity_params
    params.require(:amenity).permit!
  end
end
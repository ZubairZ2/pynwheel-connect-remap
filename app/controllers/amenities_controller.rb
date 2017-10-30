class AmenitiesController < ApplicationController
	before_action :set_community

	def new
		@amenity = @community.sitemap.amenities.new
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

	def set_community
		@community = Community.find params[:community_id]
	end
end
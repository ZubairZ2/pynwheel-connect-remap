class WebpagesController < ApplicationController
	layout false

	def index
		@community = Community.find params[:community_id]
		@units = current_community.units
	end
end
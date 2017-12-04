class GalleriesController < ApplicationController
	before_action :set_community
	add_breadcrumb "Home", :root_path

	def index
		add_breadcrumb "Gallery", "#"
	end

	private 

	def set_community
		@community = Community.find params[:community_id]
	end
end
class DesignController < ApplicationController
	before_action :authenticate_user!
	before_action :set_community
	add_breadcrumb "Home", :root_path

	def index
		add_breadcrumb "Design", community_design_index_path(@community)
	end

	private 

	def set_community
		@community = Community.find params[:community_id]
	end
end
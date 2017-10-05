class DesignController < ApplicationController
	before_action :authenticate_user!
	before_action :set_community
	add_breadcrumb "Home", :root_path

	def index
		add_breadcrumb "Design", community_design_index_path(@community)
		unless @community.design.present?
			@community.build_design
		else
			unless @community.design.menu.present?
				@community.design.build_menu
			end
			unless @community.design.main_screen.present?
				@community.design.build_main_screen
			end
			unless @community.design.home_screen.present?
				@community.design.build_home_screen
			end
		end
	end

	private 

	def set_community
		@community = Community.find params[:community_id]
	end
end
	class SettingsController < ApplicationController
	add_breadcrumb "Home", :root_path
	add_breadcrumb "Data", "##"
    before_action :set_community
	def index
		authorize! :add_settings,current_user
		add_breadcrumb "Add Credentials", community_settings_path(@community)
		@communities = current_company.communities
	end
	private
	def set_community
		@community = Community.find params[:community_id]
	end
end
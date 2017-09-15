	class SettingsController < ApplicationController
	add_breadcrumb "Home", :root_path
    before_action :set_community
	def index
		add_breadcrumb "Settings", community_settings_path(@community)
		@communities = Community.select(:id,:name)
	end
	private
	def set_community
		@community = Community.find params[:community_id]
	end
end
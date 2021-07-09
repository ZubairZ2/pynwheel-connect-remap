	class SettingsController < ApplicationController
	# include Error::ErrorHandler
	add_breadcrumb "Home", :root_path
	before_action :check_community
	before_action :set_community

	def index
		authorize! :add_settings,current_user
		add_breadcrumb "Data", community_settings_path(@community)
		@communities = current_company.communities
	end
	private
	def set_community
		@community = Community.find params[:community_id]
	end

end
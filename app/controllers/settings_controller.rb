class SettingsController < ApplicationController
	add_breadcrumb "Home", :root_path
    add_breadcrumb "Settings", :settings_path
	def index
		@communities = Community.select(:id,:name)
	end
end
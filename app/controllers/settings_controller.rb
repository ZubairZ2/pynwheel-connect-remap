class SettingsController < ApplicationController
	def index
		@communities = Community.select(:id,:name)
	end
end
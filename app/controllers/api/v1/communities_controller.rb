class Api::V1::CommunitiesController < ActionController::Base
	before_action :set_community

	def data
	end

	private
	def set_community
		@community = Community.find(params[:id])
	end
end
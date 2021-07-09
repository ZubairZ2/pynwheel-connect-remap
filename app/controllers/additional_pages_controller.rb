class AdditionalPagesController < ApplicationController
	# include Error::ErrorHandler
	before_action :set_community
	before_action :check_community
	add_breadcrumb "Home", :root_path

	def index
		add_breadcrumb "Additional Pages", community_additional_pages_path(@community)
		webpages = @community.webpages
		imagepages = @community.imagepages
		@pages = webpages + imagepages
	end

	private 

	def set_community
		@community = Community.find params[:community_id]
	end
end
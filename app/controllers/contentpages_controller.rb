class ContentpagesController < ApplicationController
  # include Error::ErrorHandler
	before_action :set_community
	before_action :check_community
	add_breadcrumb "Home", :root_path

	def new
		@webpage = @community.webpages.new
	end

	def create
		@webpage = @community.webpages.new(webpage_params)
    if @webpage.save
      flash[:notice] = "Webpage created successfully."
    else
      flash[:error] = @webpage.errors.full_messages.join(',')
    end
	end

	def edit
		@webpage = @community.webpages.find(params[:id])
	end

	def update
		@webpage = @community.webpages.find(params[:id])
		@webpage.position = nil unless params[:webpage][:position].present?
    if @webpage.update_columns(webpage_params)
      flash[:notice] = "Webpage updated successfully."
    else
      flash[:error] = @webpage.errors.full_messages.join(',')
    end
	end

	def destroy
		@webpage = @community.webpages.find(params[:id])
    if @webpage.destroy
      flash[:notice] = "Webpage deleted successfully."
    else
      flash[:error] = @webpage.errors.full_messages.join(',')
    end
    redirect_to community_additional_pages_path(@community)
	end

	private 

	def set_community
		@community = Community.find params[:community_id]
	end

	def webpage_params
		params.require(:webpage).permit(:name,:url,:hide_page,:display_on_homepage,:position,:iframe_enable_for_3Dtour)
	end
end
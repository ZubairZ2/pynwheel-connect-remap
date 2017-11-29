class FavoriteSettingsController < ApplicationController
	add_breadcrumb "Home", :root_path
	add_breadcrumb "Favorites"
  before_action :set_community

	def index
		@favorite = @community.favorite_setting || @community.build_favorite_setting
	end

	def create
		@favorite = @community.build_favorite_setting(favorite_params)
    if @favorite.save
      flash[:notice] = "Favorite settings created successfully."
      redirect_to community_favorite_settings_path(@community)
    else
      flash[:error] = @favorite.errors.full_messages.join(',')
      render :index
    end
	end

	def update
		@favorite = @community.favorite_setting
    if @favorite.update(favorite_params)
      flash[:notice] = "Favorite settings updated successfully."
      redirect_to community_favorite_settings_path(@community)
    else
      flash[:error] = @favorite.errors.full_messages.join(',')
      render :index
    end
	end

	private

	def set_community
		@community = Community.find params[:community_id]
	end

	def favorite_params
    params.require(:favorite_setting).permit(:email_from, :email_bcc)
  end
end
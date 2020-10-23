class FavoriteSettingsController < ApplicationController
	add_breadcrumb "Home", :root_path
	add_breadcrumb "Favorites Page"
  before_action :set_community
  before_action :check_community

	def index
		@favorite = @community.favorite_setting || @community.create_favorite_setting
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

    if params[:ajax_call].present?
      @favorite = FavoriteSetting.find params[:id]
      @favorite.email_body = params[:email_body]
      @favorite.save
    else
      @favorite = @community.favorite_setting
      if @favorite.update(favorite_params)
        flash[:notice] = "Favorite settings updated successfully."
        redirect_to community_favorite_settings_path(@community)
      else
        flash[:error] = @favorite.errors.full_messages.join(',')
        render :index
      end
    end

	end

  def show_images
    @favorite_setting = FavoriteSetting.find(params[:id])
    @favorite_images = @favorite_setting.favorite_images.order(:sort).all
  end

  def save_favorite_image
    @favorite_setting = FavoriteSetting.find(params[:id])
    @favorite_setting.favorite_images.create(image: params[:file],name: params["file"].original_filename)
    render :json=>{"status"=>"success"}
  end

  def delete_favorite_image
    @favorite_image = FavoriteImage.find(params[:favorite_image_id])
    file_type = @favorite_image.is_video? ? 'Video' : 'Image'
    @favorite_image.destroy
    flash[:notice] = "#{file_type} deleted successfully."
    redirect_back(fallback_location: root_path)
  end

  private

	def set_community
		@community = Community.find params[:community_id]
	end

	def favorite_params
    params.require(:favorite_setting).permit(:email_from, :email_bcc, :email_body, :show_favorite, :favorite_name,:equal_housing_opportunity_logo,:handicap_accessible_logo)
  end
end
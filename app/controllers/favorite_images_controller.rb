class FavoriteImagesController < ApplicationController
  before_action :set_community
  add_breadcrumb "Home", :root_path
  add_breadcrumb "Favorites", :community_favorite_settings_path
  add_breadcrumb "Favorites Images"
  before_action :check_community

  def index
    @favorite_images = @community.favorite_setting.favorite_images.size > 0 ? @community.favorite_setting.favorite_images : []
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
  def check_community
    unless current_user.is_super_admin?
      if params[:community_id].present?
        all_ids = []
        current_user.communities.each do |c|
          # all_ids.insert(c.id)
          all_ids << c.id
        end
        # byebug
        # puts '+++++++++++++++', all_ids[0]
        if all_ids.include? params[:community_id].to_i

        else
          redirect_to root_path
        end
      end
    end
  end

  private

  def set_community
    @community = Community.find params[:community_id]
  end

  def favorite_params
    params.require(:favorite_image).permit!
  end
end
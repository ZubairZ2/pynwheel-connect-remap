class EbrochureMenuButtonsController < ApplicationController
  before_action :set_community
  before_action :set_favorite_setting
  before_action :check_community
  before_action :set_ebrochure_menu_button,only: [:edit,:update,:destroy]
  add_breadcrumb "Home", :root_path
  add_breadcrumb "Favorites", :community_favorite_settings_path
  add_breadcrumb "Add Weblinks",:community_favorite_setting_ebrochure_menu_buttons_path

  def index
    @ebrochure_menu_buttons = @community.favorite_setting.ebrochure_menu_buttons.size > 0 ? @community.favorite_setting.ebrochure_menu_buttons : []
  end

  def new
    add_breadcrumb "Add",:new_community_favorite_setting_ebrochure_menu_button_path
    @ebrochure_menu_button = @community.favorite_setting.ebrochure_menu_buttons.new
  end

  def create
    @ebrochure_menu_button = @community.favorite_setting.ebrochure_menu_buttons.new(ebrochure_menu_button_params)
    if @ebrochure_menu_button.save
      flash[:notice] = "Weblinks added successfully."
      redirect_to community_favorite_setting_ebrochure_menu_buttons_path(@community,@favorite_setting)
    else
      flash[:error] = @ebrochure_menu_button.errors.full_messages.join(',')
      render :new
    end
  end
  def check_community
    unless current_user.is_super_admin?
      all_ids = []
      current_user.communities.each do |c|
        # all_ids.insert(c.id)
        all_ids << c.id
      end
      # byebug
      # puts '+++++++++++++++', all_ids[0]
      if all_ids.include? params[:community_id].to_i

      else
        raise ActionController::RoutingError.new('Not Found')
      end
    end
  end
  def edit
    add_breadcrumb "Edit",:edit_community_favorite_setting_ebrochure_menu_button_path
  end

  def update
    if @ebrochure_menu_button.update(ebrochure_menu_button_params)
      flash[:notice] = "Weblinks updated successfully."
      redirect_to community_favorite_setting_ebrochure_menu_buttons_path(@community,@favorite_setting)
    else
      flash[:error] = @ebrochure_menu_button.errors.full_messages.join(',')
      render :edit
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

  def destroy
    @ebrochure_menu_button.destroy
    redirect_to community_favorite_setting_ebrochure_menu_buttons_path(@community,@favorite_setting)
  end

  private

  def set_community
    @community = Community.find params[:community_id]
  end

  def set_favorite_setting
    @favorite_setting = FavoriteSetting.find params[:favorite_setting_id]
  end

  def set_ebrochure_menu_button
    @ebrochure_menu_button = EbrochureMenuButton.find params[:id]
  end

  def ebrochure_menu_button_params
    params.require(:ebrochure_menu_button).permit!
  end
end
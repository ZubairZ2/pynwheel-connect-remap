class HomepageIconsController < ApplicationController
  before_action :check_community
  add_breadcrumb "Home", :root_path
  add_breadcrumb "Home Page", :community_home_page_index_path
  add_breadcrumb "Home Page Secondary Images"
  def index
    @design = current_community.design || current_community.create_design
    @homepage_icons = @design.homepage_icons.order(:sort).all
  end

  def save_homepage_icon
    current_community.design.homepage_icons.create(image: params[:file])
    @homepage_icons = current_community.design.homepage_icons.order(:sort).all
    render :json=>{"status"=>"sucdess"}
  end

  def show_image_in_modal
    @homepage_icon = HomepageIcon.find(params[:homepage_icon_id])
  end

  def update_homepage_icon
    @homepage_icon = HomepageIcon.find(params[:homepage_icon_id])
    @homepage_icon.update(homepage_icon_params)
    flash[:notice] = "Image is edited successfully."
    redirect_back(fallback_location: root_path)
  end

  def delete_homepage_icon
    @homepage_icon = HomepageIcon.find(params[:homepage_icon_id]) 
    @homepage_icon.destroy
    flash[:notice] = "Image deleted successfully."
    redirect_back(fallback_location: root_path)
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

  def homepage_icon_params
    params.require(:homepage_icon).permit!
  end
end
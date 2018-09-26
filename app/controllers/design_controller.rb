class DesignController < ApplicationController
  before_action :set_community
  add_breadcrumb "Home", :root_path

  def index
    unless current_user.role == 'Super admin'
      redirect_to community_home_page_index_path
    end
    add_breadcrumb "Design", community_design_index_path(@community)
    @design = current_community.design || current_community.create_design
    @menu = @design.menu ||  @design.create_menu
    @main_screen = @design.main_screen ||  @design.create_main_screen
    @home_screen = @design.home_screen ||  @design.create_home_screen 
    @gable = @design.gable ||  @design.create_gable 
    @expressionist = @design.expressionist ||  @design.create_expressionist 
    @expressionist = @design.filter_panel ||  @design.create_filter_panel 
  end

  def logo
    add_breadcrumb "Logo"
    @design = current_community.design || current_community.create_design
  end

  def secondary_logo
    add_breadcrumb "Logo",logo_community_design_index_path(@community)
    add_breadcrumb "Home Page Logo"
    @design = current_community.design
  end

  private 

  def set_community
    @community = Community.find params[:community_id]
  end
end
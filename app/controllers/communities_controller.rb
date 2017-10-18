class CommunitiesController < ApplicationController
  load_and_authorize_resource
  before_action :set_community , only: [:edit,:update,:destroy,:remove_plots]
  add_breadcrumb "Home", :root_path
  add_breadcrumb "Companies", :companies_path, except: [:import_page]
  add_breadcrumb "Communities", :communities_path, except: [:import_page]

  def index
    #@communities = Community.page(params[:page]).per(10)
    @communities = current_company.communities
  end

  def new
    add_breadcrumb "Add Community", new_community_path
    @community = Community.new
  end

  def create
    @community = current_company.communities.new(community_params)
    if @community.save
      flash[:notice] = "Community created successfully."
      redirect_to communities_path
    else
      flash[:error] = @community.errors.full_messages.join(',')
      render :new
    end
  end

  def edit
    add_breadcrumb "Edit Community", edit_community_path(@community)  
  end

  def update
    authorize! :select_theme,current_user if params[:community].present? && params[:community][:theme_name].present?
    respond_to do |format|
      if @community.update(community_params)
        format.html { redirect_to communities_path,notice: 'Community updated successfully.' }
        format.js {render js: "$('#flash-message').html('#{alert_message}'); showTabsAccordingToTheme('#{@community.theme_name}'); setTimeout(function() {$('.alert').fadeOut('slow');}, 10000);"}
      else
        format.html { render :new }
        message = '<div class="alert alert-warning">'+@community.errors.full_messages.join(',')+'</div>'
        format.js {render js: "$('#flash-message').html('#{message}')"}
      end
    end
  end

  def alert_message
    if params[:community][:logo].present?
      '<div class="alert alert-success">Logo updated successfully.</div>'
    elsif params[:community][:theme_name].present?
      '<div class="alert alert-success">Theme selected successfully.</div>'
    elsif params[:community][:design_attributes].present? and params[:community][:design_attributes][:primary_font_family].present?
      '<div class="alert alert-success">Font style selected successfully.</div>'
    elsif params[:custom_style_tab].present? and params[:custom_style_tab]
      '<div class="alert alert-success">Menu options selected successfully.</div>'
    elsif params[:button_main_screen_tab].present? 
      '<div class="alert alert-success">Menu options selected successfully.</div>'
    elsif params[:button_home_screen_tab].present?
      '<div class="alert alert-success">Menu options selected successfully.</div>'       
    end
  end

  def destroy
    @community.destroy
    flash[:notice] = "Community deleted successfully."
    redirect_to communities_path
  end

  def import
    Thread.current[:errors] = []
    @community = Community.find params[:community_id]
    if @community.credentials_are_present?
      if @community.data_is_imported and Thread.current[:errors].empty?
        flash[:notice] = "Data is imported successfully."
        redirect_to community_floorplans_path(:community_id=>@community.id)
      else
        flash[:error] = Thread.current[:errors].join(',') 
        redirect_to community_import_page_path(current_community)
      end
    else
      flash[:error] = "Please enter credentials in settings before importing data."
      redirect_to community_import_page_path(current_community)
    end
  end

  def test_connection
    @community = Community.find params[:community_id]
    if @community.credentials_are_present?
      if json = @community.connect_to_provider
        render :json => json
      else
        flash[:error] = "Please enter correct credentials in settings before importing data."
        redirect_to community_import_page_path(current_community) 
      end
    else
      flash[:error] = "Please enter credentials in settings before importing data."
      redirect_to community_import_page_path(current_community) 
    end
  end

  def credentials
    @community = Community.find params[:community_id]
    unless @community.credential.present?
      @community.build_credential
    end
  end

  def import_page
    add_breadcrumb "Settings", "##"
    add_breadcrumb "Import Unit Data", community_import_page_path(current_community)
  end

  def remove_plots
    @community.delete_plots
    redirect_to plotexp_community_sitemaps_path(@community), notice: "All plots have been deleted successfully."
  end

  private

  def set_community
    @community = Community.find params[:id]
  end

  def community_params
    params.require(:community).permit(:name,:address,:city,:state,:zip,:email,:description,:latitude,:longitude,:logo,:data_provider,:theme_name,:credential_attributes=>[:id,:url,:username,:password,:property_id,:pmc_id,:server_name,:database,:platform,:interface_entity,:site_id,:c_code,:p_code],:design_attributes=>[:id,:logo_position,:secondary_logo_position,:global_navigation_position,:secondary_page_background_image,:loop_type,:primary_color,:secondary_color,:primary_font_family,:primary_font_size,:primary_font_weight,:primary_text_align,:primary_font_color,:secondary_font_family,:secondary_font_size,:secondary_font_weight,:secondary_text_align,:secondary_font_color,:menu_attributes=>[:id,:position,:button_style,:border_radius,:border_width,:border_color,:button_background_color,:button_hover_color,:manage_background,:background_color,:vertical_menu_position,:horizontal_menu_position],:main_screen_attributes=>[:id,:appartments_button,:galleries_button,:neighborhood_button,:favorities_button,:menu_position,:manage_background,:background_color],:home_screen_attributes=>[:id,:appartments_button,:galleries_button,:neighborhood_button,:favorities_button,:menu_position,:manage_background,:background_color]])
  end

end
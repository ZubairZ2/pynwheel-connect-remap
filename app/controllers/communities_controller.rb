class CommunitiesController < ApplicationController
  before_action :authenticate_user!
  load_and_authorize_resource
  before_action :set_community , only: [:edit,:update,:destroy]
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
    begin
      respond_to do |format|
        if @community.update(community_params)
          format.html { redirect_to set_community_path }
          message = '<div class="alert alert-success">'+@community.name+' updated successfully.</div>'
          format.js {render js: "$('#flash-message').html('#{message}')"}
        else
          format.html { render :new }
          message = '<div class="alert alert-warning">'+@community.errors.full_messages.join(',')+'</div>'
          format.js {render js: "$('#flash-message').html('#{message}')"}
        end
      end
    rescue 
      flash[:error] = 'Please upload logo first.'
      redirect_to community_design_index_path(@community)
    end
  end

  def set_community_path
    if params[:community][:logo].present?
      flash[:notice] = 'Logo added successfully.'
      community_design_index_path(@community)
    elsif params[:community][:theme_name].present?
      flash[:notice] = 'Theme selected successfully.'
      community_design_index_path(@community,tab: 'theme')
    elsif params[:community][:design_attributes].present? and params[:community][:design_attributes][:primary_color].present?
      flash[:notice] = 'Colors added successfully.'
      community_design_index_path(@community,tab: 'color')
    elsif params[:community][:design_attributes].present? and params[:community][:design_attributes][:primary_font_family].present?
      flash[:notice] = 'Font changes added successfully.'
      community_design_index_path(@community,tab: 'font') 
    elsif params[:community][:design_attributes].present? and params[:community][:design_attributes][:menu_attributes].present?
      flash[:notice] = 'Menu changes added successfully.'
      community_design_index_path(@community,tab: 'custom_style')
    elsif params[:community][:design_attributes].present? and params[:community][:design_attributes][:main_screen_attributes].present?
      flash[:notice] = 'Menu changes added successfully.'
      community_design_index_path(@community,tab: 'button') 
    elsif params[:community][:design_attributes].present? and params[:community][:design_attributes][:home_screen_attributes].present?
      flash[:notice] = 'Menu changes added successfully.'
      community_design_index_path(@community,tab: 'button')         
    else
      flash[:notice] = 'Community updated successfully.'
      communities_path
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

  private

  def set_community
    @community = Community.find params[:id]
  end

  def community_params
    params.require(:community).permit(:name,:address,:city,:state,:zip,:email,:description,:latitude,:longitude,:logo,:data_provider,:theme_name,:credential_attributes=>[:id,:url,:username,:password,:property_id,:pmc_id,:server_name,:database,:platform,:interface_entity,:site_id,:c_code,:p_code],:design_attributes=>[:id,:primary_color,:secondary_color,:primary_font_family,:primary_font_size,:primary_font_weight,:primary_text_align,:primary_font_color,:secondary_font_family,:secondary_font_size,:secondary_font_weight,:secondary_text_align,:secondary_font_color,:menu_attributes=>[:id,:position,:button_style,:border_radius,:border_width,:border_color,:button_background_color,:button_hover_color,:manage_background,:background_color],:main_screen_attributes=>[:id,:appartments_button,:galleries_button,:neighborhood_button,:favorities_button,:menu_position,:manage_background,:background_color],:home_screen_attributes=>[:id,:appartments_button,:galleries_button,:neighborhood_button,:favorities_button,:menu_position,:manage_background,:background_color]])
  end

end
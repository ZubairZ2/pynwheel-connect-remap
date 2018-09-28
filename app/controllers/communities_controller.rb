class CommunitiesController < ApplicationController
  #load_and_authorize_resource
  before_action :set_community , only: [:edit,:update,:destroy,:remove_plots]
  add_breadcrumb "Home", :root_path
  add_breadcrumb "Companies", :companies_path, except: [:import_page]
  add_breadcrumb "Communities", :company_communities_path, except: [:import_page]

  def index
    #@communities = Community.page(params[:page]).per(10)
    if current_user.is_super_admin?
      @communities = current_company.communities
    else
      @communities = current_user.communities
    end
  end

  def new
    add_breadcrumb "Add Community", new_company_community_path(current_company)
    @community = current_company.communities.new
  end

  def create
    @community = current_company.communities.new(community_params)
    if @community.save
      flash[:notice] = "Community created successfully."
      redirect_to company_communities_path(current_company)
    else
      flash[:error] = @community.errors.full_messages.join(',')
      render :new
    end
  end

  def edit
    add_breadcrumb "Edit Community", edit_company_community_path(current_company,@community)  
  end

  def update
    authorize! :select_theme,current_user if params[:community].present? && params[:community][:theme_name].present?
    respond_to do |format|
      if @community.update(community_params)
        @community.credential.import_data_from_spreadsheet(params[:community][:credential_attributes][:file]) if params[:community][:credential_attributes].present? and params[:community][:credential_attributes][:file].present?
        format.html { redirect_to company_communities_path(current_company),notice: 'Community updated successfully.' }
        format.js {render js: "$('#flash-message').html('#{alert_message}'); showTabsAccordingToTheme('#{@community.theme_name}'); setTimeout(function() {$('.alert').fadeOut('slow');}, 10000);"}
      else
        flash[:error] = @community.errors.full_messages.join(',')
        format.html { render :edit }
        message = '<div class="alert alert-warning">'+@community.errors.full_messages.join(',')+'</div>'
        format.js {render js: "$('#flash-message').html('#{message}')"}
      end
    end
  end

  def alert_message
    if params[:community][:data_provider].present? and params[:community][:data_provider] != 'spreadsheet'
      '<div class="alert alert-success">Credentials added successfully.</div>'
    elsif params[:community][:data_provider].present? and params[:community][:data_provider] == 'spreadsheet'
      '<div class="alert alert-success">Data is imported successfully.</div>'  
    elsif params[:community][:logo].present?
      '<div class="alert alert-success">Logo updated successfully.</div>'
    elsif params[:community][:secondary_logo].present?
      '<div class="alert alert-success">Home Page Logo updated successfully.</div>'  
    elsif params[:community][:theme_name].present?
      '<div class="alert alert-success">Theme selected successfully.</div>'
      # elsif params[:overlay_tab].present? 
      #   '<div class="alert alert-success">Expressionist options selected successfully.</div>'
    elsif params[:global_navigation_tab].present? 
      '<div class="alert alert-success">Global Navigation options selected successfully.</div>'
    elsif params[:filter_panel_tab].present? 
      '<div class="alert alert-success">Filter panel options selected successfully.</div>'
    elsif params[:home_page_tab].present? 
      '<div class="alert alert-success">Home page options selected successfully.</div>'
    elsif params[:map_marker_tab].present? 
      '<div class="alert alert-success">Map marker options selected successfully.</div>'
    elsif params[:floorplan_unit_popup_tab].present? 
      '<div class="alert alert-success">Floor plan/Unit popup options selected successfully.</div>'          
    elsif params[:community][:design_attributes][:gable_attributes].present? 
      '<div class="alert alert-success">Gables options uploaded successfully.</div>'  
    elsif params[:menu_tab].present? 
      '<div class="alert alert-success">Menu options selected successfully.</div>'  
    elsif params[:custom_style_tab].present? 
      '<div class="alert alert-success">Custom style options selected successfully.</div>'
    elsif params[:community][:design_attributes][:main_screen_attributes].present? 
      '<div class="alert alert-success">Main screen button uploaded successfully.</div>'
    elsif params[:community][:design_attributes][:home_screen_attributes].present? 
      '<div class="alert alert-success">Landing page button uploaded successfully.</div>'         
    end
  end

  def destroy
    @community.destroy
    flash[:notice] = "Community deleted successfully."
    redirect_to company_communities_path(current_company)
  end

  def import
    Thread.current[:errors] = []
    @community = Community.find params[:community_id]
    if @community.credentials_are_present?
      if @community.data_is_imported and Thread.current[:errors].empty?
        flash[:notice] = "Your data will be imported shortly.Refresh your page after few minutes."
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

  def experimental_import
    @community = Community.find params[:community_id]
    @community.experimental_data
    render :json=>{"status"=>"Importing"}
  end

  def test_connection
    @community = Community.find params[:community_id]
    if @community.credentials_are_present?
      if xml = @community.connect_to_provider
        render :xml => xml
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
  def delete_imported_data
    current_community.units.destroy_all
    current_community.floorplans.destroy_all
    current_community.data_is_imported
    redirect_to community_settings_path(current_community), notice: "All Units and flootplans data have been replaced successfully."
  end
  def import_page
    add_breadcrumb "Settings", "##"
    add_breadcrumb "Import Unit Data", community_import_page_path(current_community)
  end

  def remove_plots
    @community.delete_plots
    redirect_to plotexp_community_sitemaps_path(@community), notice: "All plots have been deleted successfully."
  end
  
  def add_plots
    units = Unit.where(community_id: params[:id], provider_unit_id: JSON.parse(params[:unit_provider_ids]))
    units.update_all(x_plot: params[:add_horizontal_position],y_plot: params[:add_vertical_position])
    redirect_to plotexp_community_sitemaps_path(@community), notice: "Plots are added successfully."
  end
  
  def add_plots_on_floorplate
    units = Unit.where(community_id: params[:id], provider_unit_id: JSON.parse(params[:unit_provider_ids]))
    units.update_all(x_plot: params[:add_horizontal_position],y_plot: params[:add_vertical_position])
    redirect_to params[:redirect_path], notice: "Plots are added successfully."
  end

  def remove_plots_from_floorplate
    @community.delete_plots_from_floorplate(params[:floorplate_id])
    redirect_to community_floorplate_plotexp_path(:community_id=>@community.id,floorplate_id: params[:floorplate_id]), notice: "All plots have been deleted successfully."
  end

  def save_temporary_image
    TemporaryImage.create(community_id: params[:community_id],image: params[:image],position: params[:position],name: params[:name])
    render :json=>{"status"=>"success"}
  end

  def delete_temporary_image
    TemporaryImage.where(community_id: params[:community_id],position: params[:position]).destroy_all
    render :json=>{"status"=>"success"}
  end

  def save_gallery_settings
    @community = Community.find params[:community_id]
    @community.show_gallery = params[:show_gallery].present? ? params[:show_gallery] : false
    @community.display_gallery_on_homepage = params[:display_gallery_on_homepage].present? ? params[:display_gallery_on_homepage] : false
    @community.gallery_page_name = params[:gallery_page_name] if params[:gallery_page_name].present?
    if @community.save
      flash[:notice] = "Gallery settings updated successfully."
      redirect_to community_galleries_path(@community)
    else
      flash[:error] = @community.errors.full_messages.join(',')
      redirect_back(fallback_location: root_path)
    end
  end
  def save_floor_plan_button
    @community = Community.find params[:community_id]
    @community.display_floorplan_gallery = params[:display_floorplan_gallery].present? ? params[:display_floorplan_gallery] : false
  
    if @community.save
      flash[:notice] = "Floor Plan settings updated successfully."
      redirect_back(fallback_location: root_path)
    else
      flash[:error] = @community.errors.full_messages.join(',')
      redirect_back(fallback_location: root_path)
    end
  end
  def save_apartment_settings
    @community = Community.find params[:community_id]
    @community.show_apartment = params[:show_apartment].present? ? params[:show_apartment] : false
    @community.display_rent = params[:display_rent].present? ? params[:display_rent] : false
    @community.display_sitemap = params[:display_sitemap].present? ? params[:display_sitemap] : false
    @community.display_unit_on_homepage = params[:display_unit_on_homepage].present? ? params[:display_unit_on_homepage] : false
    @community.apartment_page_name = params[:apartment_page_name] if params[:apartment_page_name].present?
    if @community.save
      flash[:notice] = "Apartment settings updated successfully."
      redirect_back(fallback_location: root_path)
    else
      flash[:error] = @community.errors.full_messages.join(',')
      redirect_back(fallback_location: root_path)
    end
  end

  private

  def set_community
    @community = Community.find params[:id]
  end

  def community_params
    params.require(:community).permit(:name,:address,:city,:state,:zip,:phone,:email,:description,:latitude,:longitude,:company_id,:logo,:secondary_logo,
      :data_provider,:theme_name,:code,:is_sitemap,:locked,:website,:equal_housing_opportunity_logo,:handicap_accessible_logo,
      :credential_attributes=>[:id,:url,:username,:password,:property_id,:pmc_id,:server_name,:database,:platform,:interface_entity,:site_id,:c_code,
        :api_token,:p_code,:apply_now,:file],:design_attributes=>[:id,:logo_position,:secondary_logo_position,:global_navigation_position,
        :secondary_page_background_image,:loop_type,:primary_color,:secondary_color,:primary_font_family,:primary_font_size,:primary_font_weight,
        :primary_text_align,:primary_font_color,:secondary_font_family,:secondary_font_size,:secondary_font_weight,:secondary_text_align,
        :secondary_font_color,:global_navigation_font_color,:global_navigation_background_color,:global_navigation_button_color,
        :global_navigation_buttons_opacity,:global_nav_bg_opacity,:button_shape,:global_nav_buttons_height,:global_nav_buttons_width,
        :secondary_page_menu_border,:global_nav_button_on,:global_nav_button_off,:buttons_as_image,:filter_panel_color,
        :filter_panel_font_style,:filter_panel_font_color,:filter_button_color,:filter_button_font_style,:filter_button_font_color,:filter_panel_opacity,
        :filter_buttons_opacity,:gallery_buttons_opacity,:filter_menu_buttons_border,:gallery_buttons_border,:filter_button,:gallery_button,
        :filter_panel_background_image,:filter_button_as_image,:gallery_button_as_image,:gallery_button_on_as_image,:filter_panel_background_as_image,:gallery_button_on_image,:home_page_button_shape,
        :home_page_buttons_border,:home_page_navigation_background_height,:home_page_navigation_background_color,:home_page_buttons_height,
        :home_page_buttons_width,:home_page_buttons_opacity,:home_page_navigation_background_opacity,:home_page_navigation_button_color,
        :home_page_navigation_font_color,:marker_background_color,:marker_style,:header_bg_color,:header_font_color,:details_bg_color,:details_font_color,
        :available_appartments_font_color,:available_appartments_bg_color,:floor_bg_color,:unit_header_bg_color,:unit_header_font_color,
        :unit_details_font_color,:unit_details_bg_color,:floorplan_name_bg_color,:floorplan_name_font_color,:unit_bg_color,
        :global_nav_button_on_as_image,:global_nav_button_off_as_image,:unit_header_bg_color_opacity,:unit_details_bg_color_opacity,
        :floorplan_name_bg_color_opacity,:unit_bg_color_opacity,:header_bg_color_opacity,:details_bg_color_opacity,
        :available_appartments_bg_color_opacity,:floor_bg_color_opacity,
        :menu_attributes=>[:id,:navigation_text_color,:navigation_background_color,:position,:button_style,:border_radius,:border_width,:border_color,
        :button_background_color,:button_hover_color,:manage_background,:background_color,:vertical_menu_position,:horizontal_menu_position],
        :main_screen_attributes=>[:id,:appartments_button,:galleries_button,:neighborhood_button,:favorities_button,:menu_position,:manage_background,
        :background_color],:home_screen_attributes=>[:id,:appartments_button,:galleries_button,:neighborhood_button,:favorities_button,:about_button,
        :building_button,:floorplan_button,:menu_position,:manage_background,:background_color],:gable_attributes=>[:id,:hide_tagline,
        :appartment_button_color,:gallery_button_color,:neighborhood_button_color,:favorite_button_color,:filter_panel_color,:webpages_button_color,
        :imagepages_button_color],:expressionist_attributes=>[:id,:home_page_menu_position,:home_page_position_of_logo,:home_page_logo_size,
        :home_page_button_border_color,:display_home_page_button_icon,:home_page_button_font_family,:home_page_button_font_size,:display_home_page_image,
        :display_home_page_nav_background,:display_global_nav_background_image,:home_page_button_image,:display_global_navigation_button_icon,:global_navigation_button_border_color,
        :global_navigation_button_font_family,:global_navigation_button_font_size,:display_global_navigation_button_bg_color,:filter_panel_button_border_color,
        :filter_panel_text_font_size,:filter_panel_button_text_font_size, :spacing_between_buttons, :button_on_bg_color, :display_button_on_bg_color,:global_navigation_button_on_font_color,
        :application_background_image,:display_home_page_nav_background_image,:display_application_background_image,:application_background_color,:button_on_bg_color_opacity,
        :application_background_color_opacity,:display_apartment_nav_bg_image,:display_gallery_nav_bg_image, 
        :display_favourities_nav_bg_image,:display_additional_pages_nav_bg_image,:apartment_nav_bg_image,:gallery_nav_bg_image,
        :favourities_nav_bg_image,:additional_pages_nav_bg_image,:display_apartment_btn_on_image,:apartment_btn_on_image,:display_gallery_btn_on_image, 
        :gallery_btn_on_image,:display_neighborhood_btn_on_image,:neighborhood_btn_on_image, :display_imagepage_btn_on_image,:imagepage_btn_on_image,
        :display_webpage_btn_on_image,:webpage_btn_on_image,:display_favourite_btn_on_image,:favourite_btn_on_image,:display_apartment_btn_off_image,
        :apartment_btn_off_image,:display_gallery_btn_off_image,:gallery_btn_off_image,:display_neighborhood_btn_off_image,:neighborhood_btn_off_image,
        :display_imagepage_btn_off_image,:imagepage_btn_off_image, :display_webpage_btn_off_image,:webpage_btn_off_image,:display_favourite_btn_off_image,
        :favourite_btn_off_image, :global_navigation_btn_on_for_all,:global_navigation_btn_off_for_all,:home_page_background_image,
        :global_nav_background_image],:filter_panel_attributes=>[:id,:button_border_color,:text_font_size,:button_text_font_size,:gallery_button_on_font_color,:display_gallery_button_on_background_color,:gallery_button_on_background_color,:display_filter_panel_icon,:filter_panel_icon_color,:icon_background_color,:icon_background_color_opacity,:gallery_button_on_background_color_opacity]])
  end

end
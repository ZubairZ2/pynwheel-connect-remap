class CommunitiesController < ApplicationController
  # include Error::ErrorHandler
  include DweloDevicesHelper
  include CommunitiesHelper
  include FeedbacksHelper
  #load_and_authorize_resource
  before_action :check_community
  before_action :set_community , only: [:update_coloring_mode, :update_marketing_map_colors, :edit,:update,:destroy,:remove_plots, :sitemap_auto_plot_units, :floorplate_auto_plot_units, :suggest_sitemap_units, :suggest_floorplate_units]
  add_breadcrumb "Home", :root_path
  add_breadcrumb "Companies", :companies_path, except: [:import_page, :settings_page]
  add_breadcrumb "Communities", :company_communities_path, except: [:import_page,:settings_page]

  # add_breadcrumb "Companies", :companies_path, except: [:import_page, :settings_page,:logs]
  # add_breadcrumb "Communities", :company_communities_path, except: [:import_page,:settings_page,:logs]

  def index
    #@communities = Community.page(params[:page]).per(10)
    if params[:enable_communities].present?
      user_enable_communities_ids = CommunityUser.where(user_id: params[:user], chat_enable: true).map { |x| x.community_id } rescue nil
      if user_enable_communities_ids.present?
        user_enable_communities = Community.where(id: user_enable_communities_ids).pluck(:id, :name).to_json rescue nil
        render :json => {data: user_enable_communities}, :status => 200
      else
        render :json => {data: user_enable_communities.to_json}, :status => 200
      end
    end
    if current_user.is_super_admin?
      @communities = alphabetical_sort(current_company.communities)
    elsif current_user.is_dwelo_admin? || current_user.is_company_admin?
      @communities = alphabetical_sort(current_company.communities) # Community.all.where(creator_id: User.all.map{|u| u.id if u.role == "Dwelo admin"}.compact)
    elsif current_user.is_regional_admin?
      @communities = alphabetical_sort(current_user.region.communities)
    else
      @communities = alphabetical_sort(current_user.communities)
    end
  end
  def new
    add_breadcrumb "Add Community", new_company_community_path(current_company)
    @community = current_company.communities.new 
    @all_regions = current_company.regions.order(:name).collect {|p| [ p.name, p.id ] } rescue []
    @com_id = 0
  end

  def create
    @community = current_company.communities.new(community_params)
    @community.lincoln_app = true if current_company.name.downcase.include?("lincoln") rescue nil
    if current_company.name.downcase.include?(CommunityConstants::DWELO_TAG) or current_company.name.downcase.include?(CommunityConstants::DWELO)
      @community.name = CommunityConstants::DWELO_TAG + @community.name
      # @community.creator_id = User.where(role: "Dwelo admin").first.id unless current_user.is_dwelo_admin?
    end
    if @community.save
      CommunityUser.create(community_id: @community.id, user_id: current_user.id)
      @community.create_neighborhood
      flash[:notice] = "Community created successfully."
      if @community.creator_id.present? and @community.creator.present? and @community.creator.role == "Dwelo admin"
        desings_for_new_community(@community)
        redirect_to community_settings_page_path(:community_id=>@community.id)
      else
        redirect_to community_design_index_path(@community)
      end
    else
      @all_regions = current_company.regions.order(:name).collect {|p| [ p.name, p.id ] } rescue []
      flash[:error] = @community.errors.full_messages.join(',')
      render :new
    end
  end
  
  # def logs
  #   @community = Community.find params[:community_id]
  #   @logs = #PaperTrail::Version.where.not(whodunnit: nil).order(created_at: :desc).paginate(page: params[:page], per_page: 20)
  # end

  def edit
    @com_id = current_community.id
    @chatroom = params[:tour_user_id].present? ? show_chat_modal(params[:tour_user_id], current_community.community_tour.id) : Chatroom.new
    @all_regions = current_company.regions.order(:name).collect {|p| [ p.name, p.id ] } rescue []
    add_breadcrumb "Property Details", edit_company_community_path(current_company,@community)
  end

  def settings_page
    authorize! :edit_settings_page, current_user
    tour = @community.create_tour if @community.community_tour.nil?	
    tour.create_tour_setting if tour.present? and tour.tour_setting.nil?
    add_breadcrumb "Companies", companies_path(current_company)
    add_breadcrumb "Communities", company_communities_path(current_company)
    add_breadcrumb "Settings"
    @community = Community.find params[:community_id]
    @all_regions = current_company.regions.order(:name).collect {|p| [ p.name, p.id ] } rescue []
  end

  def update_web_maps_configurations
    ThreeDMapsConfiguration.find_or_initialize_by(:community_id => params[:community_id]).update!(maps_configuration_params)
    sleep(1)
  end

  def update_billing_rate
    @community.update!(lincoln_billing_rate: params[:community][:lincoln_billing_rate], dwelo_billing_rate: params[:community][:dwelo_billing_rate],billing_rate_maps: params[:community][:billing_rate_maps],billing_rate_touch: params[:community][:billing_rate_touch],billing_rate_selftour: params[:community][:billing_rate_selftour])
  end

  def update
    if params[:community][:enable_svg_mode].present? or params[:community][:billing_rate_touch].present? or params[:community][:lincoln_billing_rate].present? or params[:community][:dwelo_billing_rate].present? or params[:community][:billing_rate_selftour].present? or params[:community][:billing_rate_maps].present? or params[:community][:billing_rate_for_both].present?
      @community.update!(enable_svg_mode: params[:community][:enable_svg_mode] == "1", lincoln_billing_rate: params[:community][:lincoln_billing_rate], dwelo_billing_rate: params[:community][:dwelo_billing_rate],billing_rate_maps: params[:community][:billing_rate_maps],billing_rate_touch: params[:community][:billing_rate_touch],billing_rate_selftour: params[:community][:billing_rate_selftour], billing_rate_for_both: params[:community][:billing_rate_for_both])
    end

    if params[:community][:company_id].present?
      company = Company.find(params[:community][:company_id]) rescue nil
      if company.name.downcase.include?("dwelo")
        dwelo_admin = User.all.where(role: "Dwelo admin").first
        @community.update(creator_id: dwelo_admin.id) 
      else
        @community.update(creator_id: "")
      end
    end

    unless @community.data_provider.present?
      @community.update(data_provider: "psi" )
    end

    @all_regions = current_company.regions.order(:name).collect {|p| [ p.name, p.id ] } rescue []
    if params[:community][:image]
      @community.crop_x = nil
    end
    if params["community"]["latitude"].present?
      @community.neighborhood.update(latitude: params["community"]["latitude"], longitude: params["community"]["longitude"]) rescue ""
    end

    if params["verification_type"].present?
      begin
        tour = @community.community_tour
        tour.verification_type = params["verification_type"]
        tour.save
      rescue Exception => e

      end
    end
    if params[:community][:secondary_image]
      @community.crop_x_secondary = nil
    end
    if params[:community][:restrict_access].present?
      if params[:community][:allowed_emails].present?
        @community.allowed_emails.destroy_all
        allowed_emails = params[:community][:allowed_emails].split(',').map(&:lstrip)
        allowed_emails.each do |email|
          @community.allowed_emails.create(email: email)
        end
      else
        @community.allowed_emails.destroy_all
      end
    end
    @community.image_bit = nil
    authorize! :select_theme,current_user if params[:community].present? && params[:community][:theme_name].present?
    respond_to do |format|

      if params[:spreadsheet_method] == '2'
        if @community.update(community_params)
          @community.credential.swap_data_from_spreadsheet(params[:community][:credential_attributes][:file]) if params[:community][:credential_attributes].present? and params[:community][:credential_attributes][:file].present?
          format.html { redirect_to company_communities_path(current_company),notice: 'Community updated successfully.' }
          format.js {render js: "$('#flash-message').html('#{alert_message}'); showTabsAccordingToTheme('#{@community.theme_name}'); setTimeout(function() {$('.alert').fadeOut('slow');}, 10000);"}
        else
          flash[:error] = @community.errors.full_messages.join(',')
          format.html { render :edit }
          message = '<div class="alert alert-warning">'+@community.errors.full_messages.join(',')+'</div>'
          format.js {render js: "$('#flash-message').html('#{message}')"}
        end

      elsif params[:spreadsheet_method] == '0' || params[:spreadsheet_method] == '1'
        if params[:spreadsheet_method] == '1'
          current_community.units.destroy_all
          current_community.floorplans.destroy_all
        end
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
      else
        inner_check = true

        params[:community][:billing_month] = params[:community][:billing_month] if params[:community][:billing_month].present?
        @community.date_activated = Date.today if (params[:community][:locked].present? && params[:community][:locked] == "0")
        @community.date_inactivated = Date.today if (params[:community][:locked].present? && params[:community][:locked] == "1")
        params[:community][:billing_month] = params[:community][:billing_month][0] if params[:community][:billing_month].present?
        if params[:community][:show_map].present?
          if @community.show_map == false &&  params[:community][:show_map] == "1"
            ts = TourStop.where(tour_id: @community.community_tour.id, latitude: nil,longitude: nil)
            ts1 = TourStop.where(tour_id: @community.community_tour.id, latitude: 0,longitude: 0)
            ts.destroy_all if ts.present?
            ts1.destroy_all if ts1.present?
          end
        end

        if inner_check
          if @community.update(community_params)
            
            update_map_type(@community)

            @community.credential.import_data_from_spreadsheet(params[:community][:credential_attributes][:file]) if params[:community][:credential_attributes].present? and params[:community][:credential_attributes][:file].present?
            if params[:community][:name].present?
              format.html { redirect_to company_communities_path(current_company),notice: 'Community updated successfully.' }
            else
              format.html { redirect_to community_settings_page_path(current_community),notice: 'Community updated successfully.' }
            end

            format.js {render js: "$('#flash-message').html('#{alert_message}'); showTabsAccordingToTheme('#{@community.theme_name}'); setTimeout(function() {$('.alert').fadeOut('slow');}, 10000);"}
          else
            flash[:error] = @community.errors.full_messages.join(',')
            if params[:community][:name].present?
              format.html { render :edit }
            else
              format.html { render :settings_page }
            end
            message = '<div class="alert alert-warning">'+@community.errors.full_messages.join(',')+'</div>'
            format.js {render js: "$('#flash-message').html('#{message}')"}
          end
        end
      end
    end
  end

  def update_map_type community
    if community.enable_three_d_maps
      community.update(web_map_type: "3d-map")
      
    else
      community.update(web_map_type: "2d-map")
    end
  end

  def update_marketing_map_colors
    if @community.update(community_marker_colors_params)
      redirect_to community_design_index_path(@community),
                  notice: "Marketing map colors updated successfully."
    else
      redirect_to community_design_index_path(@community),
                  alert: "There was a problem updating marketing map colors."
    end
  end

  def update_coloring_mode
    if @community.update(community_coloring_mode_params)
      redirect_to community_design_index_path(@community),
                  notice: "Coloring mode updated successfully."
    else
      redirect_to community_design_index_path(@community),
                  alert: "There was a problem updating coloring mode."
    end
  end

  def clone_community
    @community = Community.find params[:community_id]
    @community.clone_a_community(@community)
    redirect_to community_design_index_path(current_community),notice: 'Community will clone within few seconds.'
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
    elsif params[:community][:email_logo].present?
      '<div class="alert alert-success">Email Logo updated successfully.</div>'
    elsif params[:community][:self_tour_logo].present?
      '<div class="alert alert-success">Home Page Logo updated successfully.</div>'
    elsif params[:community][:pynwheel_launch_access].present?
      '<div class="alert alert-success">Access Pynwheel Launchs updated successfully.</div>'
    elsif params[:community][:theme_name].present?
      '<div class="alert alert-success">Theme selected successfully.</div>'
    elsif params[:global_navigation_tab].present?
      '<div class="alert alert-success">Global Navigation options selected successfully.</div>'
    elsif params[:filter_panel_tab].present?
      '<div class="alert alert-success">Filter panel options selected successfully.</div>'
    elsif params[:home_page_tab].present?
      '<div class="alert alert-success">Home page options selected successfully.</div>'
    elsif params[:map_marker_tab].present?
      '<div class="alert alert-success">Map marker options selected successfully.</div>'
    elsif params[:ebrochure_settings_tab].present?
      '<div class="alert alert-success">Ebrochure settings options selected successfully.</div>'
    elsif params[:ebrochure_settings_tab_message].present?
      '<div class="alert alert-success">Ebrochure settings options selected successfully.</div>'
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
  
  def make_cordinate    
    @community.update(latitude: params[:lat], longitude: params[:long]) rescue ""
    @community.neighborhood.update(latitude: address[0], longitude: address[1]) rescue ""
    render :json=>{"cord"=> "ok" }
  end

  def destroy
    idd = @community.id
    design_id = @community.design.id if @community.design.present?
    @community.delete_community
    DeleteLogsOnDestroy.perform_async idd,design_id
    flash[:notice] = "Community will be deleted within few mintues."
    redirect_to company_communities_path(current_company)
  end

  def import
    Thread.current[:errors] = []
    @community = Community.find params[:community_id]
    if @community.credentials_are_present? && @community.check_credentials
      if @community.data_is_imported and Thread.current[:errors].empty?
        flash[:notice] = "Good job! You have successfully imported this property's data."
        #PaperTrail::Version.create(item_type: "ImportData",item_id: @community.id,event: "update",whodunnit: current_user.id,community_id: current_community.id, company_id: current_company.id,object: "name: #{@community.name} community_id: '#{@community.id}'")
        redirect_to community_settings_path(:community_id=>@community.id)
      else
        flash[:error] = Thread.current[:errors].join(',')
        redirect_to community_settings_path(:community_id=>@community.id)
      end
    else
      flash[:error] = "Please enter valid credentials in settings before importing data."
      redirect_to community_settings_path(:community_id=>@community.id)
    end
  end

  def import_pynwheel_access_users_data
    Thread.current[:errors] = []
    @community = Community.find params[:community_id]
    if @community.credentials_are_present? && @community.check_credentials
      if @community.pynwheel_access_users_data and Thread.current[:errors].empty?
        flash[:notice] = "Good job! You have successfully imported this property's residents data."
        #PaperTrail::Version.create(item_type: "FetchResidentsData",item_id: @community.id,event: "Fetch Residents Data",whodunnit: @community.id,community_id: @community.id, company_id: @community.id,object: "name: #{@community.name} community_id: '#{@community.id}'")
        redirect_to community_settings_path(:community_id=>@community.id)
      else
        flash[:error] = Thread.current[:errors].join(',')
        redirect_to community_settings_path(:community_id=>@community.id)
      end
    else
      flash[:error] = "Please enter valid credentials in settings before importing residents data."
      redirect_to community_settings_path(:community_id=>@community.id)
    end
  end

  def clean_psi_units_data
    Thread.current[:errors] = []
    @community = Community.find params[:community_id]

    if @community.credentials_are_present? && @community.check_credentials
      if @community.clean_psi_data_provider and Thread.current[:errors].empty?
        flash[:notice] = "Good job! You have successfully Clean Units data."
        redirect_to community_settings_path(:community_id=>@community.id)
      else
        flash[:error] = Thread.current[:errors].join(',')
        redirect_to community_settings_path(:community_id=>@community.id)
      end
    else
      flash[:error] = "Please enter valid credentials in settings before clean data."
      redirect_to community_settings_path(:community_id=>@community.id)
    end
  end 

  def experimental_import
    @community = Community.find params[:community_id]
    @community.experimental_data
    render :json=>{"status"=>"Importing"}
  end

  def test_connection
    if @community.credentials_are_present?
      if xml = @community.connect_to_provider
        begin
          render :xml => xml
        rescue
          flash[:error] = "Please enter correct credentials in settings before importing data."
          redirect_to community_settings_path(:community_id=>@community.id)
        end
      else
        flash[:error] = "Please enter correct credentials in settings before importing data."
        redirect_to community_settings_path(:community_id=>@community.id)
      end
    else
      flash[:error] = "Please enter credentials in settings before importing data."
      redirect_to community_settings_path(:community_id=>@community.id)
    end
  end

  def psi_pricing_test_connection
    @community = Community.find params[:community_id]
    if @community.credentials_are_present?
      if xml = @community.connect_to_pricing(@community)
        if @community.data_provider == "realpagesvc"
          unless xml.present?
            render :xml => "Wait until data loads"
          else
            render :xml => Nokogiri::XML(@community.realpage_pricing_data)
          end
        else
          render :xml => xml
        end
      else
        flash[:error] = "Please enter correct credentials in settings before importing data."
        redirect_to community_settings_path(:community_id=>@community.id)
      end
    else
      flash[:error] = "Please enter credentials in settings before importing data."
      redirect_to community_settings_path(:community_id=>@community.id)
    end
  end
  def psi_space_configuration_test_connection
    @community = Community.find params[:community_id] 
    if @community.credentials_are_present?
      if xml = @community.connect_to_pricing_with_space_configuration(@community)
        render :xml => xml
      else
        flash[:error] = "Please enter correct credentials in settings before importing data."
        redirect_to community_settings_path(:community_id=>@community.id)
      end
    else
      flash[:error] = "Please enter credentials in settings before importing data."
      redirect_to community_settings_path(:community_id=>@community.id)
    end
  end

  def reset_neighborhood_request_counter
    Community.where(id: params[:community_id]).update_all(neighborhood_request_counter: 0, neighborhood_request_counter_limit: 600)
    AppVersion.update_all(neighborhood_counter: 0, counter_limit: 600)
    flash[:notice] = "Neighborhood request count reset successfully!"
    redirect_to community_neighborhoods_path(@community)
  end

  def realpage_load_pricing_data
    @community = Community.find params[:community_id]
    @community.connect_to_pricing(@community)
    @community.realpage_pricing_data_uploaded = false
    @community.save
    flash[:notice] = "Data is loading. Please refresh after time."
    redirect_to community_settings_path(current_community)
  end

  def show_realpage_pricing_data
    @community = Community.find params[:community_id]
    if @community.credentials_are_present?
      if xml = @community.connect_to_pricing
        render :xml => xml
      end
    else
      flash[:error] = "Please enter credentials in settings before importing data."
      redirect_to community_settings_path(:community_id=>@community.id)
    end
  end

  def credentials
    @community = Community.find params[:community_id]
    unless @community.credential.present?
      @community.build_credential
    end
    @crm_credential = @community.crm_credential.present? ? @community.crm_credential : @community.create_crm_credential
  end

  def update_imported_data
    Thread.current[:errors] = []
    @community = Community.find params[:community_id]
    if @community.credentials_are_present? && @community.check_credentials
      if @community.data_is_swaped and Thread.current[:errors].empty?
        flash[:notice] = "Good job! You have successfully imported this property's data."
        #PaperTrail::Version.create(item_type: "SwapData",item_id: @community.id,event: "update",whodunnit: current_user.id,community_id: current_community.id, company_id: current_company.id,object: "name: #{@community.name} community_id: '#{@community.id}'")

        redirect_to community_settings_path(:community_id=>@community.id)
      else
        flash[:error] = Thread.current[:errors].join(',')
        redirect_to community_settings_path(:community_id=>@community.id)
      end
    else
      flash[:error] = "Please enter credentials in settings before importing data."
      redirect_to community_settings_path(:community_id=>@community.id)
    end
  end

  def update_community_data
    Thread.current[:errors] = []
    @community = Community.find params[:community_id]

    unless (@community.locked.present? && @community.locked)
      if @community.credentials_are_present? && @community.check_credentials
        if @community.update_community_provider_data && Thread.current[:errors].empty?
          flash[:notice] = "Good job! You have successfully updated property's data."
        else
          flash[:error] = Thread.current[:errors].join(',')
        end
      else
        flash[:error] = "Please enter credentials in settings before importing data."
      end
    else
      flash[:error] = "Community is locked! Can't update"
    end

    # 👇 Redirect to where the request came from
    redirect_back fallback_location: community_settings_path(community_id: @community.id)
  end


  def invitation_communities
    if params[:user_communities].present?
      if params[:company_id].present?
        result = Company.find(params[:company_id]).communities.real_properties.order(:name).pluck(:name, :id).to_json
      elsif params[:region_id].present?
        result = Region.find(params[:region_id]).communities.real_properties.order(:name).pluck(:name, :id).to_json
      else
        user = User.find params[:user] if params[:user].present?
        result = user.present? ? user.communities.real_properties.order(:name).pluck(:name, :id).to_json : []
      end
      render :json => {data: result}, :status => 200
    elsif params['company'].present?
      company =  params['company']
      comp = Company.find_by(name: company )
      result = params['region'].present? ? (comp.regions.where(id: params['region']).first.communities.real_properties.order(:name).pluck(:name, :id).to_json) :  (comp.communities.real_properties.order(:name).pluck(:name, :id).to_json) rescue [].json
      render :json => { data: result }, :status => 200
    else
      render :json => { data: [].to_json }, :status => 200
    end

  end

  def selected_communities
    user = User.find params['user'].to_i
    if params.has_key?('company_name')
      company = Company.find_by_name(params[:company_name])
      if params.has_key?('region_id') && company.regions.where(id: params["region_id"]).any?
        region = Region.find params[:region_id]
        result = region.communities.pluck(:name,:id).to_json
      else
        result = company.communities.pluck(:name,:id).to_json
      end
    else
      result = user.communities.pluck(:name,:id).to_json
    end
    render :json => { data: result }, :status => 200

  end

  def delete_imported_data
    current_community.units.destroy_all
    current_community.floorplans.destroy_all

    stop_id = current_community.community_tour.tour_stops.where(stop_type: "unit").destroy_all
    VisitedStop.where(tour_stop_id: stop_id.pluck(:id)).destroy_all
    # CustomizeTourService.new(current_community, nil).remove_community_tour_stops

    Thread.current[:errors] = []
    @community = Community.find params[:community_id]

    if @community.credentials_are_present?
      if current_community.data_is_imported and Thread.current[:errors].empty?
        flash[:notice] = "Good job! You have successfully imported this property's data."
        #PaperTrail::Version.create(item_type: "ReplaceData",item_id: @community.id,event: "update",whodunnit: current_user.id,community_id: current_community.id, company_id: current_company.id,object: "name: #{@community.name} community_id: '#{@community.id}'")

        redirect_to community_settings_path(:community_id=>@community.id)
      else
        flash[:error] = Thread.current[:errors].join(',')
        redirect_to community_settings_path(current_community)
      end
    else
      flash[:error] = "Please enter credentials in settings before importing data."
      redirect_to community_settings_path(current_community)
    end
  end

  def import_page
    add_breadcrumb "Settings", "##"
    add_breadcrumb "Import Unit Data", community_import_page_path(current_community)
  end

  def remove_plots
    @community.delete_plots(params[:svg_deletion] == "true")
    redirect_to plotexp_community_sitemaps_path(@community), notice: "All plots have been deleted successfully."
  end

  def suggest_sitemap_units
    if !Rails.env.development?
      sitemap = @community.sitemap if @community.sitemap.present?
      sitemap.update(is_ocr_enabled: params[:is_ocr_enabled])

      aws_ocr_detected_units = fetch_aws_detected_units(sitemap.validated_image_url)
      store_map_ocr_data(sitemap, aws_ocr_detected_units)

      redirect_to plotexp_community_sitemaps_path(@community), notice: "Suggestions for sitemap has #{sitemap.is_ocr_enabled ? "enabled" : "disabled"} successfully"
    else

      redirect_to plotexp_community_sitemaps_path(@community), alert: "Something went wrong please check sitemap image"
    end
  end

  def suggest_floorplate_units
    if !Rails.env.development?
      floorplate = Floorplate.find params[:floorplate_id] if params[:floorplate_id].present?
      floorplate.update(is_ocr_enabled: params[:is_ocr_enabled])

      aws_ocr_detected_units = fetch_aws_detected_units(floorplate.validated_image_url)
      store_map_ocr_data(floorplate, aws_ocr_detected_units)

      redirect_to community_floorplate_plotexp_path(:community_id=>@community.id,floorplate_id: params[:floorplate_id]), notice: "Suggestions for floorplate has #{floorplate.is_ocr_enabled ? "enabled" : "disabled"} successfully"
    else

      redirect_to community_floorplate_plotexp_path(:community_id=>@community.id,floorplate_id: params[:floorplate_id]), alert: "Something went wrong please check floorplate image"
    end
  end

  def sitemap_auto_plot_units
    if !Rails.env.development?
      sitemap = @community.sitemap if @community.sitemap.present?

      if sitemap.present? && sitemap.image.present? && sitemap.image.url.present?
        units = @community.units.where(floorplate_id: nil)

        aws_ocr_detected_units = fetch_aws_detected_units(sitemap.validated_image_url)
        store_map_ocr_data(sitemap, aws_ocr_detected_units)

        dimensions = image_original_dimensions(sitemap)
        set_sitemap_markers_on_map(units, aws_ocr_detected_units, dimensions)
      else

        redirect_to plotexp_community_sitemaps_path(@community), alert: "Something went wrong please check sitemap image"
      end

      redirect_to plotexp_community_sitemaps_path(@community), notice: "Auto plotting is done on the sitemap successfully"
    else

      redirect_to plotexp_community_sitemaps_path(@community), alert: "Automate plotting is not allowed in development environment"
    end
  end

  def floorplate_auto_plot_units
    if !Rails.env.development?
      floorplate = Floorplate.find params[:floorplate_id] if params[:floorplate_id].present?
      
      if floorplate.present? && floorplate.image.present? && floorplate.image.url.present?
        aws_ocr_detected_units = fetch_aws_detected_units(floorplate.validated_image_url)
        store_map_ocr_data(floorplate, aws_ocr_detected_units)

        units = floorplate.fetch_units
        dimensions = image_original_dimensions(floorplate)
        set_floorplate_markers_on_map(units, aws_ocr_detected_units, dimensions, floorplate.id)
      else

        redirect_to community_floorplate_plotexp_path(:community_id=>@community.id,floorplate_id: params[:floorplate_id]), alert: "Something went wrong please check floorplate image"
      end

      redirect_to community_floorplate_plotexp_path(:community_id=>@community.id,floorplate_id: params[:floorplate_id]), notice: "Auto plotting is completed on the floorplate successfully"
    else

      redirect_to community_floorplate_plotexp_path(:community_id=>@community.id,floorplate_id: params[:floorplate_id]), alert: "Automate plotting is not allowed in development environment"
    end
  end

  def add_plots
    units = Unit.where(community_id: params[:id], provider_unit_id: JSON.parse(params[:unit_provider_ids]))
    new_attributes = if params[:add_pointer].present?
                       x_plot, y_plot, tag, id, selector = params[:add_pointer].values_at(:x_plot, :y_plot, :tag, :id, :selector)
                       { pointer_data: { x_plot: x_plot, y_plot: y_plot, tag: tag, id: id, selector: selector } }
                     elsif params[:add_horizontal_position].present? && params[:add_vertical_position].present?
                       { 
                         x_plot: params[:add_horizontal_position],
                         y_plot: params[:add_vertical_position],
                       }
                     else
                       {}
                     end
    units.update_all(new_attributes)
    redirect_to plotexp_community_sitemaps_path(@community.present? ? @community : current_community), notice: "Plots are added successfully."
  end

  def add_plots_on_floorplate
    units = Unit.where(community_id: params[:id], provider_unit_id: JSON.parse(params[:unit_provider_ids]))
    new_attributes = if params[:add_pointer].present?
                       x_plot, y_plot, tag, id, selector = params[:add_pointer].values_at(:x_plot, :y_plot, :tag, :id, :selector)
                       { pointer_data: { x_plot: x_plot, y_plot: y_plot, tag: tag, id: id, selector: selector } }
                     elsif params[:add_horizontal_position].present? && params[:add_vertical_position].present?
                       { 
                         x_plot: params[:add_horizontal_position],
                         y_plot: params[:add_vertical_position],
                       }
                     else
                       {}
                     end
    units.update_all(new_attributes)
    redirect_to params[:redirect_path], notice: "Plots are added successfully."
  end

  def remove_plots_from_floorplate
    current_community.delete_plots_from_floorplate(params[:floorplate_id], params[:svg_deletion] == "true")
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
  def save_tour_settings
    @community = Community.find params[:community_id]
    @tour = @community.community_tour
    @tour_setting = @tour.tour_setting
    unless params[:community].present? && params[:community][:optional_mails].present?    
      if params[:widget_settings]
        @tour_setting.show_first_name = params[:show_first_name].present? ? params[:show_first_name] : false

        @tour_setting.allow_self_tour = params[:allow_self_tour].present? ? params[:allow_self_tour] : false
        @tour_setting.allow_guided_tour = params[:allow_guided_tour].present? ? params[:allow_guided_tour] : false
        @tour_setting.allow_virtual_tour = params[:allow_virtual_tour].present? ? params[:allow_virtual_tour] : false
        # @tour_setting.show_phone = params[:show_phone].present? ? params[:show_phone] : false
        @tour_setting.show_email = params[:show_email].present? ? params[:show_email] : false
        @tour_setting.show_desired_bedroom = params[:show_desired_bedroom].present? ? params[:show_desired_bedroom] : false
        @tour_setting.show_desired_move_in_date = params[:show_desired_move_in_date].present? ? params[:show_desired_move_in_date] : false
        @tour_setting.time_intervel = "15 min" if params[:time_intervel_15] == "true"
        @tour_setting.time_intervel = "30 min" if params[:time_intervel_30] == "true"
        @tour_setting.time_intervel = "1 hr" if params[:time_intervel_1] == "true"
        @tour_setting.time_intervel = "2 hrs" if params[:time_intervel_2] == "true"
        @tour.credit_card_required = params[:credit_card_required].present? ? true : false
        # @tour.max_tour_users = params[:max_tour_users]
        @tour.only_scheduled_tour = params[:only_scheduled_tour].present?
        @tour.grace_period = params[:grace_time] if params[:grace_time].present?
        @tour.marketing_source_required = params[:marketing_source_required].present? ? true : false

      else
        @community.chat_control = params[:chat_control].present? ? params[:chat_control] : false
        @community.show_tour_page = params[:show_tour_page].present? ? params[:show_tour_page] : false
        @community.show_camera_button = params[:show_camera_button].present? ? true : false
        @community.scheduler_widget = params[:scheduler_widget].present? ? true : false
        @community.automate_unit_stop = params[:automate_unit_stop].present? ? params[:automate_unit_stop] : false
        @tour.enable_auto_zoom = params[:enable_auto_zoom].present? ? params[:enable_auto_zoom] : false
        @tour.max_virtual_tour_users = params[:max_virtual_tour_users]
        @tour.max_self_tour_users = params[:max_self_tour_users]
        @tour.max_guided_tour_users = params[:max_guided_tour_users]   
        @tour_setting.do_limit_max_tour = params[:do_limit_max_tour]   
        @tour_setting.limit_max_tour_type = params[:limit_max_tour_type]   
        @tour_setting.limit_max_tour = params[:limit_max_tour]
        @tour_setting.length_stay_limit = params[:length_stay_limit].to_i
        @tour_setting.charge_user_for_id_verfication = params[:charge_user_for_id_verfication].present? ? params[:charge_user_for_id_verfication] : false
        @tour_setting.enable_restricted_property_access = params[:enable_restricted_property_access].present? ? params[:enable_restricted_property_access] : false
        @tour_setting.enable_tour_customization = params[:enable_tour_customization].present? ? params[:enable_tour_customization] : false
        @tour_setting.bypass_stop_lock_access = params[:bypass_stop_lock_access]
        @tour.visual_id_verification = params[:visual_id_verification].present? ? params[:visual_id_verification] : false
        @tour.dotted_line_color = params[:dotted_line_color] if params[:dotted_line_color].present?
      end
      @tour.save
      @tour_setting.save

    else
      @tour_setting = @community.community_tour.tour_setting
      @tour_setting.enable_header_footer = params[:enable_header_footer].present? ? true : false
      @tour_setting.email_header_color = params[:email_header_color] if params[:email_header_color].present?
      @tour_setting.email_footer_color = params[:email_footer_color] if params[:email_footer_color].present?
      @tour_setting.save
      
      @community.alert_contact = params[:community][:alert_contact] if params[:community][:alert_contact].present?
      @community.email_text = params[:community][:email_text]
      @community.one_day_email_text = params[:community][:one_day_email_text] 
      @community.one_hour_email_text = params[:community][:one_hour_email_text]
      @community.thank_you_message = params[:community][:thank_you_message]
      @community.arrive_too_early_alert = params[:community][:arrive_too_early_alert] if params[:community][:arrive_too_early_alert].present?
      @community.arrive_too_late_alert = params[:community][:arrive_too_late_alert] if params[:community][:arrive_too_late_alert].present?
      @community.unscheduled_alert = params[:community][:unscheduled_alert] if params[:community][:unscheduled_alert].present?
      @community.unscheduled_alert_with_widget = params[:community][:unscheduled_alert_with_widget] if params[:community][:unscheduled_alert_with_widget].present?
    end

    if @community.save
      if @community.chat_control
        CommunityUser.joins(:community).where(communities: {chat_control: true}, community_users: {user_id: current_user.id, chat_enable: true}).update_all(is_logged_in: true)
        Community.joins(:community_users).where(communities: {chat_control: true}, community_users: {user_id: current_user.id, chat_enable: true}).update_all(is_chat_available: true)
      end
      flash[:notice] = "Tour settings updated successfully."
      redirect_to settings_community_tours_path(@community)
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
    @community.display_pricing_options = params[:display_pricing_options].present? ? params[:display_pricing_options] : false
    @community.display_building = params[:display_building].present? ? params[:display_building] : false
    @community.display_available_date = params[:display_available_date].present? ? params[:display_available_date] : false
    @community.display_sitemap = params[:display_sitemap].present? ? params[:display_sitemap] : false
    @community.display_floorplan_gallery = params[:display_floorplan_gallery].present? ? params[:display_floorplan_gallery] : false
    @community.display_unit_on_homepage = params[:display_unit_on_homepage].present? ? params[:display_unit_on_homepage] : false
    @community.apartment_page_name = params[:apartment_page_name] if params[:apartment_page_name].present?
    @community.show_property_map_key = params[:show_property_map_key].present? ? params[:show_property_map_key] : false
    @community.show_amenity_key = params[:show_amenity_key].present? ? params[:show_amenity_key] : false
    @community.sitemap_auto_zoom = params[:sitemap_auto_zoom].present? ? params[:sitemap_auto_zoom] : false
    @community.show_property_map_key_text = params[:show_property_map_key_text] if params[:show_property_map_key_text].present?
    @community.show_amenity_key_text = params[:show_amenity_key_text] if params[:show_amenity_key_text].present?
    @community.pricing_message =  params[:pricing_message]
    @community.units_availability_over_120_days = params[:units_availability_over_120_days]
    @community.show_current_availability = params[:show_current_availability]
    @community.is_floor_level_map = params[:is_floor_level_map]
    @community.turn_availability_on = params[:turn_availability_on]
    @community.display_additional_fee = params[:display_additional_fee]
    @community.display_manual_additional_fee = params[:display_manual_additional_fee]
    @community.additional_fee = params[:additional_fee]
    
    if @community.save
      flash[:notice] = "Apartment settings updated successfully."
      redirect_back(fallback_location: root_path)
    else
      flash[:error] = @community.errors.full_messages.join(',')
      redirect_back(fallback_location: root_path)
    end
  end

  def desings_for_new_community(current_community)
    design = current_community.design || current_community.create_design
    menu = design.menu ||  design.create_menu
    main_screen = design.main_screen ||  design.create_main_screen
    home_screen = design.home_screen ||  design.create_home_screen 
    gable = design.gable ||  design.create_gable 
    expressionist = design.expressionist ||  design.create_expressionist 
    expressionist = design.filter_panel ||  design.create_filter_panel 
  end

  def update_amenity_toggle
    @community.update(show_amenity_name: ActiveRecord::Type::Boolean.new.cast(params[:community][:show_amenity_name]) )
    flash[:notice] = "Show amenity name on webpages updated successfully."
    redirect_to community_amenities_path(@community)
  end

  private

  def store_map_ocr_data model_object, aws_ocr_detected_units
    if model_object.present? && model_object.image.present? && model_object.image.url.present?
      model_object.update(map_ocr_data: aws_ocr_detected_units)
    end
  end

  def fetch_aws_detected_units image_url
    AwsTextract.aws_texract_ocr_service(image_url)
  end

  def store_map_ocr_data model_object, aws_ocr_detected_units
    if model_object.present? && model_object.image.present? && model_object.image.url.present?
      model_object.update(map_ocr_data: aws_ocr_detected_units)
    end
  end

  def fetch_aws_detected_units image_url
    AwsTextract.aws_texract_ocr_service(image_url)
  end

  def store_map_ocr_data model_object, aws_ocr_detected_units
    if model_object.present? && model_object.image.present? && model_object.image.url.present?
      model_object.update(map_ocr_data: aws_ocr_detected_units)
    end
  end

  def fetch_aws_detected_units image_url
    AwsTextract.aws_texract_ocr_service(image_url)
  end

  def show_chat_modal(tour_user_id, tour_id)
    @chatroom = Chatroom.find_by(tour_user_id: tour_user_id, tour_id: tour_id)
    @chatroom = Chatroom.create(tour_user_id: tour_user_id, tour_id: tour_id) unless @chatroom.present?
    return @chatroom
  end

  def set_community
    @community = Community.find params[:id]
  end
 
  def community_params
    params.require(:community).permit(:use_company_level_data_settings, :show_amenity_name,:property_manager_name,:property_manager_phone,:property_manager_email, :enable_three_d_maps,:web_map_type,:enable_amenity_legend,:enable_home_legend,:community_logo,:pynwheel_access,:name,:creator_id,:default_community_id, :region_id,:billing_rate_touch,:billing_rate_for_both, :lincoln_billing_rate,:dwelo_billing_rate , :billing_rate_selftour, :billing_rate_maps,:address,:number_of_units,:city,:state,:zip,:phone,:email,:description, :manual_lat_long,:latitude,:longitude,:company_id,:logo,:secondary_logo,:self_tour_logo, :email_logo, :restrict_access,:scheduler_widget,:pynwheel_touch,
      :auto_wayfinding, :data_provider,:theme_name,:code,:is_sitemap,:menu_button_shade,:enable_locks,:locked,:website,:equal_housing_opportunity_logo,:handicap_accessible_logo,:powered_by_btn,:tour_setup_visible, :chat_control, :self_tour, :pynwheel_launch_access, :show_map, :mdu, :touchscreen_app,:apply_now_pynwheel_touch_and_go,:apply_now_pynwheel_touch,:apply_now_self_tour, :show_gesture_icons,:billing_type,:billing_rate,:date_installed,:billing_month,:is_vertical_app,:enable_svg_mode,
      :credential_attributes=>[:unit_name_key, :currency, :yardi_rent_cafe_api_url, :entrata_available_units_only, :entrata_show_unit_spaces, :entrata_use_space_configuration,:id,:url,:entrata_url,:rentmanager_username,:rentmanager_password,:rentmanager_property_id, :rentmanager_base_url, :username,:password, :perq_property_id, :is_perq_allowed, :property_id, :app_folio_property_id, :app_folio_database_id,:pmc_id,:server_name,:database,:platform,:interface_entity,:site_id,:c_code,
      :api_token,:p_code,:apply_now,:allow_separate_link,:separate_link, :allow_sub_communities, :use_different_crm_provider,:limit_result,:file,:resman_apikey, :resman_partner_id, :resman_account_id, :xml_filename, :xml_domain, :rentcafe_api_version, :resman_api_version, :resman_property_id,:zaremba_filename,:zaremba_property_id,:zaremba_username, :zaremba_password],:crm_credential_attributes=>[:crm_provider, :entrata_domain, :entrata_username, :entrata_password, :entrata_property_id, :realpage_site_id, :realpage_pmc_id, :rentcafe_c_code, :rentcafe_p_code, :rentcafe_domain ,:salesforce_username, :yardirentcafe_marketing_api_key, :yardirentcafe_property_id, :yardirentcafe_property_code,:salesforce_password, :salesforce_client_id, :salesforce_secret_id, :salesforce_property_id, :salesforce_grant_type], :design_attributes=>[:id,:logo_position,:secondary_logo_position,:global_navigation_position,
        :property_map_size,:property_map_color,:property_map_missing_color,:property_map_occupied_color,:property_map_occupied_on_notice_color,:property_map_vacant_leased_color,:property_map_model_color,:modernist_map_marker_color,:amenity_map_marker_size,:amenity_map_marker_color,:amenity_map_marker_size_integer,
        :futurist_property_map_marker_color, :expressionist_property_map_marker_color, :panther_property_map_marker_color, :futurist_amenity_map_marker_color,:expressionist__amenity_map_marker_color,
        :panther_amenity_map_marker_color,:futurist_property_map_size,:expressionist_property_map_size,:panther_property_map_size,:modernist_property_map_size, :futurist_amenity_map_size, :expressionist_amenity_map_size, :panther_amenity_map_size, :modernist_amenity_map_size,
        :futurist_unit_floorplan_map_marker_color, :expressionist_unit_floorplan_map_marker_color, :panther_unit_floorplan_map_marker_color, :gables_unit_floorplan_map_marker_color, :modernist_unit_floorplan_map_marker_color,
        :display_ebrochure_header_background_color,:expressionist_ebrochure_header_background_color,:panther_ebrochure_header_background_color,:gables_ebrochure_header_background_color,:modernist_ebrochure_header_background_color,:ebrochure_email_message,:futurist_ebrochure_header_background_color,:property_map_size_integer,:modernists_amenity_map_marker_color,:secondary_page_background_image,:loop_type,:primary_color,:secondary_color,:primary_font_family,:primary_font_size,:primary_font_weight,
        :primary_text_align,:primary_font_color,:secondary_font_family,:secondary_font_size,:secondary_font_weight,:secondary_text_align,
        :secondary_font_color,:global_navigation_font_color,:global_navigation_background_color,:global_navigation_button_color,
        :global_navigation_buttons_opacity,:global_nav_bg_opacity,:button_shape,:global_nav_buttons_height,:global_nav_buttons_width,
        :secondary_page_menu_border,:global_nav_button_on,:global_nav_button_off,:buttons_as_image,:filter_panel_color,
        :filter_panel_font_style,:filter_panel_font_color,:filter_button_color,:filter_panel_label_color,:filter_panel_label_opacity ,:filter_button_font_style,:filter_button_font_color,:filter_panel_opacity,
        :filter_buttons_opacity,:gallery_buttons_opacity,:filter_menu_buttons_border,:gallery_buttons_border,:filter_button,:gallery_button,
        :filter_panel_background_image,:filter_label_image,:display_filter_label_image,:filter_button_as_image,:gallery_button_as_image,:gallery_button_on_as_image,:filter_panel_background_as_image,:gallery_button_on_image,:home_page_button_shape,
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
        :building_button,:floorplan_button,:menu_position,:manage_background,:background_color],:gable_attributes=>[:id,:hide_tagline,:home_page_nav_bg_image, :display_home_page_nav_bg_image_button, :global_nav_bg_image, :display_global_nav_bg_image_button, :filter_panel_bg_image,:display_filter_panel_bg_image_button,
        :filter_panel_text_color,:filter_panel_opacity,:application_bg_image_gables,:apartment_bg_image_gables,:gallery_bg_image_gables,
        :favourite_bg_image_gables,:additional_pages_bg_image_gables,:display_application_bg_image_gables,:display_apartment_bg_image_gables,:display_gallery_bg_image_gables,:display_favourite_bg_image_gables,:display_additional_pages_bg_image_gables,
        :appartment_button_color,:gallery_button_color,:neighborhood_button_color,:favorite_button_color,:filter_panel_color,:webpages_button_color,
        :imagepages_button_color],:expressionist_attributes=>[:id,:home_page_menu_position,:home_page_position_of_logo,:home_page_logo_size,
        :home_page_button_border_color,:display_home_page_button_icon,:home_page_button_font_family,:overlay_text ,:overlay_font,:overlay_size,:overlay_color,:overlay_text_position,:overlay_opacity ,:home_page_button_font_size,:display_home_page_image,
        :display_home_page_nav_background,:display_global_nav_background_image,:home_page_button_image,:display_global_navigation_button_icon,:global_navigation_button_border_color,
        :global_navigation_button_font_family,:global_navigation_button_font_size,:display_global_navigation_button_bg_color,:filter_panel_button_border_color,
        :filter_panel_text_font_size,:filter_panel_button_text_font_size, :spacing_between_buttons,:use_gables_buttons,:home_page_icons_position,:button_text_position,:homepage_button_border_thickness, :homepage_button_border,:global_navigation_icons_position,:global_nav_button_icon_size,
        :filter_buttons_icons_position,:global_navigation_show_background_color,:global_navigation_home_icon,:global_navigation_text_outside_the_button_border,:gables_home_page_images,:home_page_logo_visible,:global_navigation_border_thickness,:spacing_between_buttons_for_homepage, :button_on_bg_color, :display_button_on_bg_color,:display_global_navigation_button_color,:global_navigation_button_on_font_color,
        :application_background_image,:display_home_page_nav_background_image,:display_application_background_image,:application_background_color,:button_on_bg_color_opacity,
        :application_background_color_opacity,:display_apartment_nav_bg_image,:display_gallery_nav_bg_image, 
        :display_favourities_nav_bg_image,:display_additional_pages_nav_bg_image,:display_neighborhood_bg_image,:neighborhood_bg_image,:apartment_nav_bg_image,:gallery_nav_bg_image,
        :favourities_nav_bg_image,:additional_pages_nav_bg_image,:display_apartment_btn_on_image,:apartment_btn_on_image,:display_gallery_btn_on_image, 
        :gallery_btn_on_image,:display_neighborhood_btn_on_image,:neighborhood_btn_on_image, :display_imagepage_btn_on_image,:imagepage_btn_on_image,
        :display_webpage_btn_on_image,:webpage_btn_on_image,:display_favourite_btn_on_image,:favourite_btn_on_image,:display_apartment_btn_off_image,
        :apartment_btn_off_image,:display_gallery_btn_off_image,:gallery_btn_off_image,:display_neighborhood_btn_off_image,:neighborhood_btn_off_image,
        :display_imagepage_btn_off_image,:imagepage_btn_off_image, :display_webpage_btn_off_image,:webpage_btn_off_image,:display_favourite_btn_off_image,
        :favourite_btn_off_image, :global_navigation_btn_on_for_all,:global_navigation_btn_off_for_all,:home_page_background_image,
        :global_nav_background_image],:filter_panel_attributes=>[:id,:button_border_color,:text_font_size,:button_text_font_size,:gallery_button_on_font_color,:display_gallery_button_on_background_color,:gallery_button_on_background_color,:display_filter_panel_icon,:filter_panel_icon_color,:icon_background_color,
        :filter_panel_buttons_show_backround_color,:filter_buttons_icons_position,:icon_background_color_opacity,:gallery_button_on_background_color_opacity]])
  end

  def maps_configuration_params
    params.require(:community).permit(:default_polygon_color,:selected_polygon_color,:default_polygon_opacity,:selected_polygon_opacity,:unit_color,:selected_unit_color,:poi_color,
    :faded_ploygon_opacity,:show_unit_numbers,:hide_floors)
  end

  def community_marker_colors_params
    params.require(:community).permit(
      :available_units_color,
      :available_units_opacity,
      :model_units_color,
      :model_units_opacity,
      :amenities_color,
      :amenities_opacity
    )
  end

  def community_coloring_mode_params
    params.require(:community).permit(:coloring_mode)
  end

end
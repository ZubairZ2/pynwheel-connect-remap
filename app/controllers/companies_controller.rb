class CompaniesController < ApplicationController
  load_and_authorize_resource
  
  add_breadcrumb "Home", :root_path
  add_breadcrumb "Companies", :root_path
  before_action :set_company , only: [:edit,:update,:destroy]
  before_action :check_community
  
  def index
    if current_user.is_super_admin?
      @companies = alphabetical_sort(Company.all)
    elsif current_user.is_dwelo_admin?
      @companies = alphabetical_sort(Company.all.where(creator_id: User.all.map{|u| u.id if u.role == "Dwelo admin"}.compact))
    else
      @companies = alphabetical_sort(Company.where(id: current_user.company_id))
    end

    # Pynwheel Connect (Next.js) reads the same list over JSON.
    render_connect_companies if request.format.json?
  end

  def new
    add_breadcrumb "Add Company", new_company_path
    @company = Company.new
  end

  def create
    @company = Company.new(company_params)
    @company.name = CommunityConstants::DWELO_TAG + @company.name if current_user.is_dwelo_admin?
    if @company.save
      flash[:notice] = "Company created successfully."
      redirect_to companies_path
    else
      flash[:error] = @company.errors.full_messages.join(',')
      render :new
    end
  end

  def edit
    add_breadcrumb "Edit Company", edit_company_path(@company)
  end

  def update
    if @company.update(company_params)
      flash[:notice] = "Company updated successfully."
      redirect_to companies_path
    else
      flash[:error] = @company.errors.full_messages.join(',')
      render :edit
    end
  end

  def destroy
    @company.delete_company
    flash[:notice] = "Company will be deleted within few mintues."
    redirect_to companies_path
  end

  def check_current_company
    redirect_to new_company_path if current_company.nil?
  end

  def get_regions
    @regions = []
    if params[:company].present?
      company = Company.find_by_name(params[:company])
      @regions = company.regions.map {|r|[r.name, r.id]}
    end
    if params[:only_region_options_data].present? && params[:only_region_options_data] == "true"
      render :json => {data: @regions}, :status => 200
    else
      render partial: 'get_regions', layout: false
    end
  end

  def company_data_credentials
    respond_to do |format|
      provider = params[:company][:data_providers]
      @company.data_providers << provider unless @company.data_providers.include?(provider)
    if @company.update(company_params)
      communities = @company.communities.includes(:credential).where(use_company_level_data_settings: true, data_provider: provider).where.not(credentials: { id: nil })
      update_communities_credentials(communities, provider)
      flash[:notice] = "Credentials added successfully."
      format.html {redirect_to @company.company_setting.present? ? edit_company_company_setting_path(@company, @company.company_setting,community_id: current_community&.id) : new_company_company_setting_path(@company, community_id: current_community&.id)}
    else
      message = '<div class="alert alert-warning">'+@company.errors.full_messages.join(',')+'</div>'
      format.js {render js: "$('#flash-message').html('#{message}')"}
    end
    end
  end

  def company_data_provider_communities_list
    provider = params[:provider]
    @communities = @company.communities.includes(:credential).where(use_company_level_data_settings: true, data_provider: provider).where.not(credentials: { id: nil })
    respond_to do |format|
      format.js
    end
  end
  def generate_csv
    @communities = fetch_communities_hash(params[:id])
    company = Company.find params[:id]
    tour_users = TourUser.includes(:tour_histories).where(tour_histories: {community_id: @communities.keys}).order('tour_histories.arrived ASC')
    headers = %w{Property\ Id Property\ Name Visitor\ Name Visitor\ Email Visitor\ Phone Is\ Abandoned\ Tour Tour\ Type Tour\ Month Tour\ Date Tour\ Time Region}
    csv_file = CSV.generate(headers: true) do |csv|
      csv << headers
      tour_users.each do |tu|
        if tu.tour_histories.any?
          tu.tour_histories.each do |th|
            csv << fetch_tour_hitory_data(tu, th)
          end
        end
      end
    end

    send_data(csv_file, :type => 'application/xlsx', :filename => "#{company.name}.csv")
  end

  def generate_csv_for_scheduled_records
    company = Company.find params[:id]
    communities = company.communities
    
    tour_histories = TourHistory.where(community_id: communities.self_tour_enabled_only.ids)
    scheduled_records = SchedualTour.where(community_id: communities.self_tour_enabled_only.ids).where.not(tour_user_id: nil).where(tour_type: ["self_tour", "guided_tour", "Virtual Tour", "Self Guided"])
    headers = %w{Property\ Id Property\ Name Visitor\ Name Visitor\ Email Visitor\ Phone Tour\ Status Tour\ Type Tour\ Month Tour\ Date Tour\ Time Region Tour\ Scheduled\ By}
    csv_file = CSV.generate(headers: true) do |csv|
      csv << headers
      scheduled_records.each do |sr|
        csv << fetch_tour_hitory_data_for_scheduled(sr)
      end
    end

    send_data(csv_file, :type => 'application/xlsx', :filename => "#{company.name} - Scheduled Records.csv")
  end

  private

  def render_connect_companies
    render json: Connect::ResponseEnvelope.new(
      data: Connect::CompanySerializer.collection(@companies),
      meta: Connect::ResponseEnvelope.listing_meta(current_user, @companies.size)
    ).as_json
  end

  def set_company
    @company = Company.find params[:id]
  end
  
  def company_params
    params.require(:company).permit(:name,:address,:city,:state,:zip,:email,:phone,:logo,:inactivate, :creator_id,:credential_attributes=>[:currency, :yardi_rent_cafe_api_url, :entrata_available_units_only,:id,:url,:entrata_url,:username,:password,:pmc_id,:server_name,:database,:platform,:interface_entity,:c_code,
                                                                                                                                           :api_token,:resman_apikey, :resman_account_id, :resman_api_version, :rentcafe_api_version,:yardi_username,:yardi_password],data_providers: [])
  end

  def update_communities_credentials(communities, provider)
    excluded_credential = [
      "id", "perq_property_id", "is_perq_allowed", "property_id", "site_id", "p_code",
      "apply_now", "allow_separate_link", "separate_link", "use_different_crm_provider",
      "limit_result", "resman_partner_id", "xml_filename", "xml_domain","username","password",
      "resman_property_id", "zaremba_filename", "zaremba_property_id",
      "zaremba_username", "zaremba_password", "new_requested_data_provider","yardi_username","yardi_password"
    ]
    credential_attributes = @company.credential&.attributes&.except(*excluded_credential)
    communities.each do |community|
      community_credential = community.credential || community.build_credential
      if community.data_provider == 'yardi'
        credential_attributes["username"] = @company.credential.yardi_username
        credential_attributes["password"] = @company.credential.yardi_password
      else
        credential_attributes["username"] = @company.credential.username
        credential_attributes["password"] = @company.credential.password
      end
      community_credential.update(credential_attributes)
      community.update(data_provider: provider)
    end
  end

  def fetch_communities_hash(company_id)
    communities = Community.where(company_id: params[:id]).pluck(:id, :name)
    communities.to_h
  end
  
  def fetch_tour_status(tour_status)
    type = "Virtual Tour"
    type = "App Guided Tour" if ["self_tour", "Self Guided"].include?(tour_status)
    type = "Person Guided Tour" if ["guided_tour"].include?(tour_status)
    type
  end
  
  def fetch_tour_hitory_data(tour_user,tour_history)
    obj = []
    arrived = tour_history.arrived.in_time_zone((tour_history.community_time_zone rescue 'UTC'))
    obj << tour_history.community_id #Community Id
    obj << @communities[tour_history.community_id] # Community Name
    obj << tour_user.name
    obj << tour_user.email
    obj << tour_user.phone_number
    obj << (tour_history.tour_state == "abandoned") # is abandoned tour
    obj << fetch_tour_status(tour_history.tour_status) # Is Self Guided, OR Virtual Tour
    obj << arrived.strftime('%B')
    obj << arrived.to_date
    obj << arrived.strftime("%I:%M %p")
    obj << Community.find(tour_history.community_id).region&.name
    obj
  end

  def fetch_tour_hitory_data_for_scheduled(scheduled_tour)
    obj = []
    obj << scheduled_tour.community_id #Community Id
    obj << Community.find(scheduled_tour.community_id).name # Community Name
    obj << scheduled_tour.tour_user.name
    obj << scheduled_tour.tour_user.email
    obj << scheduled_tour.tour_user.phone_number
    obj << fetch_schedule_tour_status(scheduled_tour.property_tour_type,scheduled_tour.tour_type) # is abandoned tour
    obj << fetch_tour_type(scheduled_tour.tour_type) # Is Self Guided, OR Virtual Tour
    obj << scheduled_tour.tour_date.strftime('%B')
    obj << scheduled_tour.tour_date.to_date
    obj << scheduled_tour.tour_time.strftime("%I:%M %p")
    obj << Community.find(scheduled_tour.community_id).region&.name
    obj << scheduled_tour.created_by
    obj
  end

  def fetch_schedule_tour_status(property_tour_type,tt)
    if (property_tour_type == "scheduled_tour" || property_tour_type.blank?)  && tt == "self_tour"
      "App Guided Tour - Scheduled"
    elsif property_tour_type == "unscheduled_self_tour"
      "App Guided Tour - Unscheduled"
    elsif property_tour_type == "remote_tour"
      "Remote"
    else
      if !property_tour_type.present? && (tt == "guided_tour")
        "Scheduled"
      else
        "Remote"
      end
    end
  end

  def fetch_tour_type(tour_type)
    type = "Virtual Tour"
    type = "App Guided Tour" if ["self_tour", "Self Guided"].include?(tour_type)
    type = "Person Guided Tour" if ["guided_tour"].include?(tour_type)
    type
  end

end
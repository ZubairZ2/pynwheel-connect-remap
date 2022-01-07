class CompaniesController < ApplicationController
  # include Error::ErrorHandler
  load_and_authorize_resource
  add_breadcrumb "Home", :root_path
  add_breadcrumb "Companies", :root_path
  before_action :set_company , only: [:edit,:update,:destroy]
  before_action :check_community
  #before_action :check_current_company , except: [:new,:create]
  def index
    if current_user.is_super_admin?
      @companies = alphabetical_sort(Company.all)
    elsif current_user.is_dwelo_admin?
      @companies = alphabetical_sort(Company.all.where(creator_id: User.all.map{|u| u.id if u.role == "Dwelo admin"}.compact))
    else
      @companies = alphabetical_sort(Company.where(id: current_user.company_id))
    end
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

  def generate_csv
    # property id, property name, visitor name, visitor email, visitor phone, is abandoned tour, tour type, tour month, tour date, tour time
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

  private
  def set_company
    @company = Company.find params[:id]
  end
  def company_params
    params.require(:company).permit(:name,:address,:city,:state,:zip,:email,:phone,:logo,:inactivate, :creator_id)
  end
  def fetch_communities_hash(company_id)
    communities = Community.where(company_id: params[:id]).pluck(:id, :name)
    communities.to_h
  end
  def fetch_tour_status(tour_status)
    type = "Virtual Tour"
    type = "Self Tour" if ["self_tour", "Self Guided"].include?(tour_status)
    type = "Guided Tour" if ["guided_tour"].include?(tour_status)
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

end
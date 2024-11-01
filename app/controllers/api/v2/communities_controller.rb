class Api::V2::CommunitiesController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :load_community , :except => [:index]
  before_action :check_brand_access , :only => [:show , :update]
  before_action :load_community_user, :only => [:update_status_and_remarks, :move_to_production]
  before_action :load_current_user, :only => [:move_to_production]

  def index
    @communities = PynwheelLaunch::Communities::Searcher.new(current_pynwheel_user , params).get_user_communities
    @communities = @communities.paginate(page: page_number, per_page: per_page)
    meta_attributes = get_meta_attributes(@communities)
    render :json => {data: @communities.as_json, meta: meta_attributes}
  end

  def show
    render :json => {data: @community.as_json(@brand_pdf_feature)}
  end

  def get_community_detail_forms
    @community_user = CommunityUser.find_by_id(params[:community_user])
    render :json => {:success => true , data: @community_user.as_json}
  end

  def update
    community = params[:community]
    if community["logo"].present?
      @community.remove_file!
      update_community = @community.update(name: community["name"] , logo: community["logo"] , address:  community["address"], city: community["city"], state: community["state"], email: community["email"], phone: community["phone"], zip: community["zip"], property_manager_name: community["property_manager_name"], property_manager_phone: community["property_manager_phone"],property_manager_email:  community["property_manager_email"], website: community["website"] , number_of_units: community["number_of_units"] , brand_details_pdf: community["brand_details_pdf"])
    else
      @community.remove_logo!
      update_community = @community.update(name: community["name"] , file: community["file"] , address:  community["address"], city: community["city"], state: community["state"], email: community["email"], phone: community["phone"], zip: community["zip"], property_manager_name: community["property_manager_name"], property_manager_phone: community["property_manager_phone"],property_manager_email:  community["property_manager_email"], website: community["website"] , number_of_units: community["number_of_units"] , brand_details_pdf: community["brand_details_pdf"])
    end

    if @community.update(community_params)
      @community.update_community_details_form_status(current_pynwheel_user, params["community"]["status"])

      render :json => {data: @community.as_json(@brand_pdf_feature) , :message => "Community Details updated succesfully."}
    else
      render :json => {:success => false, :message => @community.errors.full_messages}
    end
  end

  def add_comment
    @comment = @community.comments.new(content:params[:message] , whodunit: current_pynwheel_user.id)
    if @comment.save
      render :json => {data: @comment.as_json, :message => "Comment added succesfully."}
    else
      render :json => {:success => false, :message => @comment.errors.full_messages}
    end
  end

  def delete_community_logo
    if @community&.logo&.url.present?
      @community.remove_logo!
    else
      @community.remove_file!
    end
    @community.save
    if !@community&.logo&.url.present? && !@community&.file&.url.present?
      render :json => {:success => true, data: @community.as_json , :message => "Community logo deleted succesfully."}
    else
      render :json => {:success => false, :message => @community.errors.full_messages}
    end
  end

  def get_products
    product_json = @community.product_options
    if product_json.present?
      @product_json = JSON.parse(product_json)
      render :json => { data: @product_json }
    else
      render :json => { :message => "No products found."}
    end
  end

  def update_products
    product_attributes = params[:product_options].to_json
    parsed_products = params["product_options"]
    self_tour = parsed_products["product_options"]["self_tour"]["is_enabled"]
    pynwheel_touch = parsed_products["product_options"]["pynwheel_touch"]["is_enabled"]
    if @community.update_columns(product_options: product_attributes, self_tour: self_tour, touchscreen_app: pynwheel_touch)
      @product_json = JSON.parse(@community.product_options)
      render :json => { data: @product_json }
    else
      render :json => {:success => false , :message => "Sorry! something went wrong."}
    end
  end

  def update_status_and_remarks
    if @community.present? && @community_user.present?
      @community.update_status_and_remarks(params[:detail_type], params[:status][:name], params[:status][:remarks])
      render :json => {:success => true , data: @community_user.as_json}
    else
      render :json => {:success => false , :message=> "Community or community user not found"}
    end
  end

  def move_to_production
    if (@community && @community_user && @current_user).present?
      Statuses.new(@community, @current_user, params[:status]).update_statuses
      @community.move_to_production = true
      @community.submitted_final_approval_date = DateTime.now if params[:status].eql?(APPLICATION_IN_REVIEW)
      @community.released_date = DateTime.now if params[:status].eql?(RELEASED)
      @community.save
      send_emails(@community, params["status"])
      render :json => {:success => true , data: @community_user.as_json}
    else
      render :json => {:success => false , :message=> "Community or community user not found"}
    end
  end

  private


  def disregard_forms
    ([ADDITIONAL_PAGES, EBROCHURE, HARDWARE_SPECS, AMENITY_IMAGES, DESIGN_DIRECTION, COMPANY_DETAILS].include?(params[:detail_type]))
  end

  def send_emails(community, status)
    unless community.company.name.include?("Dwelo")
      if status.eql?(APPLICATION_IN_PRODUCTION)
        FollowUpMailer.send_moved_to_production(community).deliver
      elsif status.eql?(RELEASED)
        # FollowUpMailer.marketing_email(community).deliver
        FollowUpMailer.customer_success_email(community).deliver
        FollowUpMailer.accounting_email(community).deliver
        FollowUpMailer.released_application_email(community)
      end
    end
  end

  def check_brand_access
    community_user = params[:community_user_id]
    @brand_pdf_feature = check_brand_feature_access(community_user)
  end

  def check_brand_feature_access(user_id)
    community_user = CommunityUser.find_by_id(user_id)
    product_json = @community&.product_options rescue ""
    return {:brand_pdf_feature => false} if product_json.nil?
    desing_style = community_user.nested_hash_value(JSON.parse(product_json) , "desing_style")
    if desing_style.eql?(EXPRESSIONIST)
      brand_pdf_feature = true
    else
      brand_pdf_feature = false
    end
    return {:brand_pdf_feature => brand_pdf_feature}
  end

  def page_number
    params[:page].present? ? params[:page] : 1
  end

  def per_page
    params[:per_page].present? ? params[:per_page] : 10
  end

  def get_meta_attributes(collection)
    {
      "current_page": collection.current_page,
      "total_entries": collection.total_entries,
      "per_page": params[:per_page]
    }
  end

  def load_current_user
    return unless @community_user.present?
    @current_user ||= User.find_by_id @community_user&.user_id
  end

  def load_community
    @community = Community.find(params[:id])
  end

  def load_community_user
    @community_user ||= CommunityUser.find_by_id(params[:community_user_id])
  end

  def community_params
    params.permit(:status)
    params.require(:community).permit(:name , :logo , :address , :city , :state , :email , :phone , :zip, :property_manager_name, :file, :property_manager_phone,:property_manager_email , :website , :number_of_units , :brand_details_pdf)
  end

end

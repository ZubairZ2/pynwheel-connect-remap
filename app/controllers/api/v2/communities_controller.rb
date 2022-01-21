class Api::V2::CommunitiesController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :load_community , :only =>  [:add_comment , :update , :show]
  before_action :load_user_community , :only => [:get_products , :update_products]
  before_action :check_brand_access , :only => [:show , :update]


  def index
    @communities = PynwheelLaunch::Communities::Searcher.new(current_pynwheel_user , params).get_user_communities
    @communities = @communities.paginate(page: page_number, per_page: per_page)
    meta_attributes = get_meta_attributes(@communities)
    render :json => {data: @communities.as_json, meta: meta_attributes}
  end

  def show
    render :json => {data: @community.as_json(@brand_pdf_feature)}
  end

  def update
    if @community.update(community_params)
      @community.set_community_status(current_pynwheel_user)
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

  def get_products
    product_json = @community_user.product_options
    if product_json.present?
      @product_json = JSON.parse(product_json)
      render :json => { data: @product_json }
    else
      render :json => { :message => "No products found."}
    end
  end

  def update_products
    product_attributes = params[:product_options].to_json
    if @community_user.update_attributes(product_options: product_attributes)
      @product_json = JSON.parse(@community_user.product_options)
      render :json => { data: @product_json }
    else
      render :json => {:success => false , :message => "Sorry! something went wrong."}
    end
  end

  private

  def check_brand_access
    community_user = params[:community_user_id]
    @brand_pdf_feature = check_brand_feature_access(community_user)
  end

  def check_brand_feature_access(user_id)
    community_user = CommunityUser.find_by_id(user_id)
    product_json = community_user&.product_options rescue ""
    return {:brand_pdf_feature => false} if product_json.nil?
    desing_style = community_user.nested_hash_value(JSON.parse(product_json) , "desing_style")
    if desing_style == "Expressionist"
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

  def load_community
    @community = Community.find(params[:id])
  end

  def load_user_community
    @community_user = CommunityUser.find_by_id(params[:id])
  end

  def community_params
    params.require(:community).permit(:name , :logo , :address , :city , :state , :email , :phone , :zip, :property_manager_name,:property_manager_phone,:property_manager_email , :website , :number_of_units , :brand_details_pdf)
  end

end

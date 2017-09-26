class CommunitiesController < ApplicationController
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
      flash[:notice] = @community.errors.full_messages.join(',')
      render :new
    end
  end

  def edit
    add_breadcrumb "Edit Community", edit_community_path(@community)  
  end

  def update
    respond_to do |format|
      if @community.update(community_params)
        format.html { redirect_to communities_path, notice: 'Community updated successfully.' }
        message = '<div class="alert alert-success">'+@community.name+' updated successfully.</div>'
        format.js {render js: "$('#flash-message').html('#{message}')"}
      else
        format.html { render :new }
        message = '<div class="alert alert-danger">'+@community.errors.full_messages.join(',')+'</div>'
        format.js {render js: "$('#flash-message').html('#{message}')"}
      end
    end
  end

  def destroy
    @community.destroy
    flash[:notice] = "Community destroyed successfully."
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
        flash[:notice] = Thread.current[:errors].join(',') 
        redirect_to community_import_page_path(current_community)
      end
    else
      flash[:notice] = "Please enter credentials in settings before importing data."
      redirect_to community_import_page_path(current_community)
    end
  end

  def test_connection
    @community = Community.find params[:community_id]
    if @community.credentials_are_present?
      render :json => @community.connect_to_provider
    else
      flash[:notice] = "Please enter credentials in settings before importing data."
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
    add_breadcrumb "Import Unit Data", community_import_page_path(current_community)
  end

  private

  def set_community
    @community = Community.find params[:id]
  end

  def community_params
    params.require(:community).permit(:name,:address,:city,:state,:zip,:email,:description,:latitude,:longitude,:logo,:data_provider,:credential_attributes=>[:id,:url,:username,:password,:property_id,:pmc_id,:server_name,:database,:platform,:interface_entity,:site_id,:c_code,:p_code])
  end

end
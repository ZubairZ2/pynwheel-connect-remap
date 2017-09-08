class CommunitiesController < ApplicationController
  before_action :set_community , only: [:edit,:update,:destroy]

  def index
    @communities = Community.page(params[:page]).per(10)
  end

  def new
    @community = Community.new
  end

  def create
    @community = Community.new(community_params)
    if @community.save
      flash[:notice] = "Community created successfully."
      redirect_to communities_path
    else
      flash[:notice] = @community.errors.full_messages.join(',')
      render :new
    end
  end

  def edit

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
    redirect_to root_path
  end

  def import
    @community = Community.find params[:community_id]
    if @community.data_is_imported
      flash[:notice] = "Data is imported successfully."
      redirect_to community_floorplans_path(:community_id=>@community.id)
    else
      flash[:notice] = "Something went wrong."
      redirect_to root_path
    end
  end

  def credentials
    @community = Community.find params[:community_id]
    unless @community.credential.present?
      @community.build_credential
    end
  end

  private

  def set_community
    @community = Community.find params[:id]
  end

  def community_params
    params.require(:community).permit(:name,:address,:city,:state,:zip,:email,:description,:latitude,:longitude,:logo,:data_provider,:credential_attributes=>[:id,:domain,:username,:password,:property_id,:pmc_id,:licence_key,:host,:server_name,:database,:platform,:interface_entity])
  end

end
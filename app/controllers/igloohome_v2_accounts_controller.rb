class IgloohomeV2AccountsController < ApplicationController
  before_action :set_user
  before_action :set_igloohome, only: [:map_igloohome_locks]

  def new
    @igloohome = Igloohome.new
  end

  def igloohome_code_grant_authorization
    locks_provider = current_community.multiple_locks_provider
    locks_provider << "Igloohome" unless locks_provider.include?("Igloohome")
    authorization_code = session[:authorization_code]
    if params.present? and authorization_code.present?
      response = IgloohomeLockService.new(current_community).code_grant_authorization(authorization_code)
      if response.present?
        begin
          Igloohome.where(community_id: current_community.id).first_or_create(community_id: params['community_id'], refresh_token: response['refresh_token']) rescue nil
          igloohome_account = current_community.igloohome
          igloohome_account.update_attributes(refresh_token: response['refresh_token'], is_authorized_with_pynwheel: true) if igloohome_account.present?
          current_community.update_columns(multiple_locks_provider: locks_provider) rescue nil
          session[:authorization_code] = ''
        rescue => e
          nil
        end
        flash[:notice] = "Igloohome lock authorized successfully"
        redirect_to new_community_dwelo_path
      else
        flash[:error] = "Something went wrong please try again later."
        redirect_to new_community_dwelo_path
      end
    else
      flash[:error] = "Something went wrong. Please check the credentails or contact your data provider to troubleshoot."
      redirect_to new_community_dwelo_path
    end
  end
    
  def create
    locks_provider = current_community.multiple_locks_provider
    locks_provider << "Igloohome" unless locks_provider.include?("Igloohome")
    unless @is_already_exists
      @igloohome = Igloohome.new(igloohome_params)
      if @igloohome.save
        current_community.update_columns(multiple_locks_provider: locks_provider)
        Community.find(params[:community_id]).update!(:multiple_locks_provider => locks_provider)
        flash[:notice] = "Igloohome credentails saved successfully"
        redirect_to new_community_dwelo_path
      else
        flash[:error] = @igloohome.errors.full_messages.join(',')
        render :new
      end
    else
      @igloohome = Igloohome.find_by(community_id: current_community.id)
      if @igloohome.update_attributes(igloohome_params)
        current_community.update_columns(:multiple_locks_provider => locks_provider)
        @igloohome.update_attributes(is_authorized_with_pynwheel: false) if @igloohome.is_authorized_with_pynwheel
        flash[:notice] = "Igloohome credentails updated successfully"
        redirect_to new_community_dwelo_path(current_community)
      else
        flash[:error] = @igloohome.errors.full_messages.join(',') 
        render :new
      end
    end
  end

  def destroy
    @igloohome  = Igloohome.find(params[:id])
    @igloohome.destroy
  end

  def test_igloohome_connection
    community = Community.find params[:community_id]
    igloohome_account = Igloohome.find_by(community_id: community.id) rescue nil
    if (igloohome_account && igloohome_account.refresh_token).present?
      access_token = generate_remotelock_token
      responce = IgloohomeLockService.new(current_community).get_all_deivces(access_token)

      if responce.present?
        render xml: responce
      else
        flash[:error] = "Data cannot be imported. Please check the credentails or contact your data provider to troubleshoot."
        redirect_to new_community_dwelo_path(@community)
      end
    else
      flash[:error] = "Please enter the Igloohome credentials before testing data."
      redirect_to new_community_dwelo_path(@community)
    end
  end
    
  def import_igloohome_locks
    community = Community.find params[:community_id]
    igloohome_account = Igloohome.find_by(community_id: community.id) rescue nil
    if (igloohome_account && igloohome_account.refresh_token).present?
      access_token = generate_remotelock_token
      responce = IgloohomeLockService.new(current_community).get_all_deivces(access_token)
    
      if responce.present? and responce["data"].present?
        IgloohomeLockService.new(current_community).update_deivces_in_db(responce)
        flash[:notice] = "Locks imported successfully."
        render :js => "window.location = '/communities/#{@community.id}/dwelos/new'"
      else
        flash[:error] = "Something went wrong, please check your credentials."
        render :js => "window.location = '/communities/#{@community.id}/dwelos/new'"
      end
    else
      flash[:error] = "Please enter the Igloohome credentials to import the locks."
      render :js => "window.location = '/communities/#{@community.id}/dwelos/new'"
    end
  end

  def map_igloohome_locks
    @igloohome.map_locks_with_stops
    flash[:notice] =  "Locks are automapped successfully."
    redirect_to new_community_dwelo_path(current_community)
  end

  def remove_igloohome_auth_account
    if current_community.igloohome.present?
      if current_community.igloohome.refresh_token.present?
        current_community.igloohome.update_attributes(refresh_token: nil, is_authorized_with_pynwheel: false)
        flash[:notice] = "Account disconnected successfully"
        redirect_to new_community_dwelo_path(current_community)
      else
        flash[:error] = "No account is attached"
        redirect_to new_community_dwelo_path(current_community)
      end
    else
      flash[:error] = "Credentials for igloohome are missing"
      redirect_to new_community_dwelo_path(current_community)
    end
  end

  def update_igloo_auth_toggle
    current_community.igloohome.update(is_authorized_with_pynwheel: params.dig(:is_authorized_with_pynwheel) === "true") if params.dig(:is_authorized_with_pynwheel).present?
  end

  private

  def igloohome_params
    params.require(:igloohome).permit(:client_id, :client_secret, :community_id)
  end

  def set_user
    @is_already_exists = Igloohome.find_by(community_id: current_community.id).present?
  end

  def set_igloohome
    @igloohome = current_community.igloohome

    unless @igloohome.present?
      flash[:error] = "Please enter the igloohome credentials before testing data."
      redirect_to new_community_dwelo_path(current_community)
    end
  end
end
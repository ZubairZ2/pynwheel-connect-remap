class EdgestateAccountsController < ApplicationController
  before_action :set_user
  before_action :set_edge_state, only: [:map_edgestate_locks, :add_lock_instructions]
  
  def new
    @edge_state = EdgeState.new
  end

  def edgestate_code_grant_authorization
    locks_provider = current_community.multiple_locks_provider
    locks_provider << "EdgeState" unless locks_provider.include?("EdgeState")
    authorization_code = session[:authorization_code]
    if params.present? and authorization_code.present?
      response = RemoteLockService.new(current_community).code_grant_authorization(authorization_code)
      if response.present?
        begin
          EdgeState.where(community_id: current_community.id).first_or_create(community_id: params['community_id'], refresh_token: response['refresh_token']) rescue nil
          edgestate_account = current_community.edge_state
          edgestate_account.update(refresh_token: response['refresh_token'], is_authorized_with_pynwheel: true) if edgestate_account.present? || (edgestate_account.client_id and edgestate_account.client_secret).present?
          current_community.update(multiple_locks_provider: locks_provider) rescue nil
          session[:authorization_code] = ''
        rescue => e
          nil
        end
        flash[:notice] = "EdgeState lock authorized successfully"
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
    locks_provider << "EdgeState" unless locks_provider.include?("EdgeState")
    unless @is_already_exists
      @edge_state = EdgeState.new(edge_state_params)
      if @edge_state.save
        current_community.update(multiple_locks_provider: locks_provider)
        Community.find(params[:community_id]).update!(:multiple_locks_provider => locks_provider)
        flash[:notice] = "EdgeState credentails saved successfully"
        redirect_to new_community_dwelo_path
      else
        flash[:error] = @edge_state.errors.full_messages.join(',')
        render :new
      end
    else
      @edge_state = EdgeState.find_by(community_id: current_community.id)
      if @edge_state.update(edge_state_params)
        current_community.update(:multiple_locks_provider => locks_provider)
        @edge_state.update(is_authorized_with_pynwheel: false) if @edge_state.is_authorized_with_pynwheel
        flash[:notice] = "EdgeState credentails updated successfully"
        redirect_to new_community_dwelo_path(current_community)
      else
        flash[:error] = @edge_state.errors.full_messages.join(',') 
        render :new
      end
    end
  end

  def destroy
    @edge_state  = EdgeState.find(params[:id])
    @edge_state.destroy
  end

  def test_edgestate_connection
    community = Community.find params[:community_id]
    edgestate_account = EdgeState.find_by(community_id: community.id) rescue nil
    if (edgestate_account && edgestate_account.client_id && edgestate_account.client_secret).present? || (edgestate_account && edgestate_account.refresh_token).present?
      access_token = generate_remotelock_token
      responce = RemoteLockService.new(current_community).get_all_deivces(access_token)

      if responce.present?
        render xml: responce
      else
        flash[:error] = "Data cannot be imported. Please check the credentails or contact your data provider to troubleshoot."
        redirect_to new_community_dwelo_path(@community)
      end
    else
      flash[:error] = "Please enter the EdgeState credentials before testing data."
      redirect_to new_community_dwelo_path(@community)
    end
  end
    
  def import_edgestate_locks
    community = Community.find params[:community_id]
    edgestate_account = EdgeState.find_by(community_id: community.id) rescue nil
    if (edgestate_account && edgestate_account.client_id && edgestate_account.client_secret).present? || (edgestate_account && edgestate_account.refresh_token).present?
      access_token = generate_remotelock_token
      responce = RemoteLockService.new(current_community).get_all_deivces(access_token)
    
      if responce.present? and responce["data"].present?
        RemoteLockService.new(current_community).update_deivces_in_db(responce)
        flash[:notice] = "Locks imported successfully."
        render :js => "window.location = '/communities/#{@community.id}/dwelos/new'"
      else
        flash[:error] = "Something went wrong, please check your credentials."
        render :js => "window.location = '/communities/#{@community.id}/dwelos/new'"
      end
    else
      flash[:error] = "Please enter the EdgeState credentials to import the locks."
      render :js => "window.location = '/communities/#{@community.id}/dwelos/new'"
    end
  end

  def map_edgestate_locks
    @edge_state.map_locks_with_stops
    flash[:notice] =  "Locks are automapped successfully."
    redirect_to new_community_dwelo_path(current_community)
  end

  def remove_edgestate_locks
    if current_community.edge_state.present?
      if current_community.edge_state.remote_locks.present?
        current_community.edge_state.remote_locks.destroy_all
        flash[:notice] = "Locks deleted successfully"
        redirect_to new_community_dwelo_path(current_community)
      else
        flash[:error] = "No locks are present"
        redirect_to new_community_dwelo_path(current_community)
      end
    else
      flash[:error] = "Credentials for Latch are missing"
      redirect_to new_community_dwelo_path(current_community)
    end
  end

  def remove_edgestate_auth_account
    if current_community.edge_state.present?
      if current_community.edge_state.refresh_token.present?
        current_community.edge_state.update(refresh_token: nil, is_authorized_with_pynwheel: false)
        flash[:notice] = "Account disconnected successfully"
        redirect_to new_community_dwelo_path(current_community)
      else
        flash[:error] = "No account is attached"
        redirect_to new_community_dwelo_path(current_community)
      end
    else
      flash[:error] = "Credentials for edgestate are missing"
      redirect_to new_community_dwelo_path(current_community)
    end
  end

  def add_lock_instructions
    return unless params[:edgestate].present?
    @edge_state.update(lock_instruction_text: params[:edgestate][:lock_instruction_text]) if params[:edgestate][:lock_instruction_text].present?
    @edge_state.update(amenity_lock_instruction_text: params[:edgestate][:amenity_lock_instruction_text]) if params[:edgestate][:amenity_lock_instruction_text].present?

    flash[:notice] = "Updated successfully!"
    redirect_to new_community_dwelo_path(current_community)
  end

  def upload_lock_image
    @edge_state = current_community.edge_state || EdgeState.new(community_id: current_community.id)

    if params[:type].present? && params[:type] === "amenity"
     @edge_state.update(amenity_lock_image: params[:amenity_lock_image]) if params[:amenity_lock_image].present?
    else
     @edge_state.update(lock_image: params[:lock_image]) if params[:lock_image].present?
    end
  end

  private
  
  def edge_state_params
    params.require(:edgestate).permit(:client_id, :client_secret, :community_id)
  end

  def set_user
    @is_already_exists = EdgeState.find_by(community_id: current_community.id).present?
  end

  def set_edge_state
    @edge_state = current_community.edge_state

    unless @edge_state.present?
      flash[:error] = "Please enter the edge state credentials before testing data."
      redirect_to new_community_dwelo_path(current_community)
    end
  end
end
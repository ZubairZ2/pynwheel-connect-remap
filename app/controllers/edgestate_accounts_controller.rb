class EdgestateAccountsController < ApplicationController
    before_action :set_user
    before_action :set_edge_state, only: [:map_edgestate_locks]
    def new
        @edge_state = EdgeState.new
    end
    
    def create
        locks_provider = current_community.multiple_locks_provider
        locks_provider << "EdgeState" unless locks_provider.include?("EdgeState")
        unless @is_already_exists
            @edge_state = EdgeState.new(edge_state_params)
            if @edge_state.save
                current_community.update_columns(multiple_locks_provider: locks_provider)
                Community.find(params[:community_id]).update!(:multiple_locks_provider => locks_provider)
                flash[:notice] = "EdgeState credentails saved successfully"
                redirect_to new_community_dwelo_path
            else
                flash[:error] = @edge_state.errors.full_messages.join(',')
                render :new
            end
        else
            @edge_state = EdgeState.find_by(community_id: current_community.id)
            if @edge_state.update_attributes(edge_state_params)
                current_community.update_columns(:multiple_locks_provider => locks_provider)
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
    
        # redirect_to articles_path
    end

    def test_edgestate_connection
        community = Community.find params[:community_id]
        edgestate_account = EdgeState.find_by(community_id: community.id) rescue nil
        if edgestate_account.present?
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
        if edgestate_account.present?
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
          flash[:error] = "Please enter the EdgeState credentials before testing data."
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
            flash[:error] = "Please enter the Dwelo credentials before testing data."
            redirect_to new_community_dwelo_path(current_community)
          end
        end

end
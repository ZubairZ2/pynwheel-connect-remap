class EdgestateAccountsController < ApplicationController
    before_action :set_user

    def new
        @edge_state = EdgeState.new
    end
    
    def create
        unless @is_already_exists
            @edge_state = EdgeState.new(edge_state_params)
            if @edge_state.save
                current_community.update_columns(locks_provider: "EdgeState")
                Community.find(params[:community_id]).update!(locks_provider: params[:edgestate][:default_community_id])
                flash[:notice] = "EdgeState credentails saved successfully"
                redirect_to new_community_dwelo_path
            else
                flash[:error] = @edge_state.errors.full_messages.join(',')
                render :new
            end
        else
            @edge_state = EdgeState.find_by(community_id: current_community.id)
            if @edge_state.update_attributes(edge_state_params)
                current_community.update_columns(locks_provider: "EdgeState")
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
      community = Community.find(params[:community_id])
      access_token = generate_remotelock_token
      if access_token.present?
        if community.present?
          if community.is_sitemap
            community_units = community.units
            community_locks = community.edge_state.remote_locks
            community_units.each do |community_unit|
              if community_unit.building.present?
                name = community_unit.building + "-" + community_unit.marketing_name
                unit_name = name.gsub('-', '').gsub(' ', '')
                community_locks.each do |community_lock|
                  community_lock_name = community_lock.name.gsub('-', '').gsub(' ', '')
                  if (unit_name == community_lock_name)
                    community_lock.update_attributes(stop_id: community_unit.id, stop_type: "unit", stop_name: community_unit.marketing_name)
                  end
                end
              else
                unit_name = community_unit.marketing_name.gsub('-', '').gsub(' ', '')
                community_locks.each do |community_lock|
                  community_lock_name = community_lock.name.gsub('-', '').gsub(' ', '')
                  if (unit_name == community_lock_name)
                    community_lock.update_attributes(stop_id: community_unit.id, stop_type: "unit", stop_name: community_unit.marketing_name)
                  end
                end
                # same_name_lock = community_locks.find_by(name: community_unit.marketing_name) rescue nil
              end
              # if same_name_lock.present?
              #   same_name_lock.update_attributes(stop_id: community_unit.id, stop_type: "unit", stop_name: community_unit.marketing_name)
              # end
    
            end
          else
            community_locks = community.edge_state.remote_locks
            community_floorplates = community.floorplates rescue nil
            if community_floorplates.present?
              community_floorplates.each do |community_floorplate|
                community_floorplate_units = community_floorplate.units rescue nil
                community_floorplate_units.each do |floorplate_unit|
                  if floorplate_unit.building.present?
                    name = floorplate_unit.building + "-" + floorplate_unit.marketing_name
                    unit_name = name.gsub('-', '').gsub(' ', '')
                    # same_name_lock = community_locks.find_by(name: name) rescue nil
    
                    community_locks.each do |community_lock|
                      community_lock_name = community_lock.name.gsub('-', '').gsub(' ', '')
                      if (unit_name == community_lock_name)
                        community_lock.update_attributes(stop_id: floorplate_unit.id, stop_type: "unit", stop_name: floorplate_unit.marketing_name)
                      end
                    end
                  else
                    unit_name = floorplate_unit.marketing_name.gsub('-', '').gsub(' ', '')
                    community_locks.each do |community_lock|
                      community_lock_name = community_lock.name.gsub('-', '').gsub(' ', '')
                      if (unit_name == community_lock_name)
                        community_lock.update_attributes(stop_id: floorplate_unit.id, stop_type: "unit", stop_name: floorplate_unit.marketing_name)
                      end
                    end
                    # same_name_lock = community_locks.find_by(name: floorplate_unit.marketing_name) rescue nil
                  end
                  # if same_name_lock.present?
                  #   same_name_lock.update_attributes(stop_id: floorplate_unit.id, stop_type: "unit", stop_name: floorplate_unit.marketing_name)
                  # end
    
                end
    
              end
    
            end
    
          end
        end
        flash[:notice] = "Locks maped successfully."
        render :js => "window.location = '/communities/#{community.id}/dwelos/new'"
      else
        flash[:error] = "Something went wrong, please check your credentials."
        render :js => "window.location = '/communities/#{community.id}/dwelos/new'"
      end
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

end
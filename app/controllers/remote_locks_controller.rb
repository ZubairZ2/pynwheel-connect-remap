class RemoteLocksController < ApplicationController
    require 'oauth2'   
    before_action :set_user, only: [:client_credentials, :get_all_deivces, :create_access_guest, :grant_access, :authorization_code]
    before_action :set_base_url, only: [:client_credentials, :get_all_deivces, :create_access_guest, :grant_access, :authorization_code ]
    skip_before_action :authenticate_user!

    def new
        @edge_state = EdgeState.new  
    end

    def edit
        @device_id = params[:id]
        @stop_id = params[:stop_id]
        @stop_type = params[:stop_type]
        @stop_name = params[:stop_name]
        # access_token = generate_remotelock_token
        # responce = RemoteLockService.new(current_community,current_user).get_device(access_token,device_id)
        @remote_lock = RemoteLock.find_by(device_id: @device_id)
    end

    def  update
        stop_id = params[:remote_lock][:stop_id]
        device_id = params[:id]

        remote_lock = RemoteLock.find_by(device_id: device_id)
        remote_lock.update_attributes(name: params[:remote_lock][:name], remote_lock_type: params[:remote_lock][:remote_lock_type])

        access_token = generate_remotelock_token
        responce = RemoteLockService.new(current_community,current_user).update_device(access_token, device_id ,remote_lock)

        if params[:remote_lock][:stop_type] == "unit"
            redirect_to edit_community_unit_path(current_community,stop_id), notice: "Remote Lock Updated Successfully" 
        elsif params[:remote_lock][:stop_type] == "amenity"
            redirect_to edit_community_amenity_path(current_community,stop_id), notice: "Remote Lock Updated Successfully" 
        end
        # redirect_to edit_community_amenity_path(current_community,@amenity), notice: "Amenity updated successfully" 
    end
    
    private
        def set_base_url
            @base_url = "https://api.remotelock.com"
        end

        def remote_lock_params
            # not using it as this params also assign lock to previous unit, 
            # but we should update lock only as update operation suggests unless required
            params.require(:remote_lock).permit!
        end
end
class EdgestateAccountsController < ApplicationController
    before_action :set_user

    def new
        @edge_state = EdgeState.new
    end
    
    def create
        unless @is_already_exists
            @edge_state = EdgeState.new(edge_state_params)
            if @edge_state.save
                flash[:notice] = "EdgeState credentails saved successfully"
                redirect_to community_settings_page_path(current_community)
            else
                flash[:error] = @edge_state.errors.full_messages.join(',')
                render :new
            end
        else
            @edge_state = EdgeState.find_by(community_id: current_community.id)
            if @edge_state.update_attributes(edge_state_params)
                flash[:notice] = "EdgeState credentails updated successfully"
                redirect_to community_settings_page_path(current_community)
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

    private
        def edge_state_params
            params.require(:edgestate).permit(:client_id, :client_secret, :community_id)
        end

        def set_user
            @is_already_exists = EdgeState.find_by(community_id: current_community.id).present?
        end

end
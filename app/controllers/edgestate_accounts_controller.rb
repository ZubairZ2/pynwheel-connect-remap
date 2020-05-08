class EdgestateAccountsController < ApplicationController

    def new
        @edge_state = EdgeState.new
    end
    
    def create
        byebug
        @edge_state = EdgeState.new(edge_state_params)
        # if @edge_state.save
            flash[:notice] = "EdgeState credentails saved successfully"
            redirect_to community_settings_page_path(current_community)
        # else
        #     flash[:error] = @edge_state.errors.full_messages.join(',')
        #     render :new
        # end
    end

    def destroy
        @edge_state  = EdgeState.find(params[:id])
        @edge_state.destroy
     
        # redirect_to articles_path
    end

    private
        def edge_state_params
            params.require(:edgestate).permit(:client_id, :client_secret, :user_id, :community_id)
        end

end
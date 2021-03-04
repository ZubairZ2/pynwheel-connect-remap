class LatchAccountsController < ApplicationController
    before_action :set_user

    def new
        @latch = Latch.new
    end
    
    def create
        locks_provider = current_community.multiple_locks_provider
        locks_provider << "Latch" unless locks_provider.include?("Latch")
        unless @is_already_exists
            @latch = Latch.new(latch_params)
            result = parse_csv(params[:file]) if params[:file].present?
            if @latch.save
                current_community.update_columns(:multiple_locks_provider => locks_provider)
                flash[:notice] = "Latch credentails saved successfully"
                redirect_to new_community_dwelo_path
            else
                flash[:error] = @latch.errors.full_messages.join(',')
                redirect_to new_community_dwelo_path
            end
        else
            @latch = Latch.find_by(community_id: current_community.id)
            result = parse_csv(params[:file]) if params[:file].present?
            if @latch.update_attributes(latch_params)
                current_community.update_columns(:multiple_locks_provider => locks_provider)
                flash[:notice] = "Latch credentails updated successfully"
                redirect_to new_community_dwelo_path
            else
                flash[:error] = @latch.errors.full_messages.join(',')
                redirect_to new_community_dwelo_path
            end
        end
    end

    def remove_latch_locks
        if current_community.latch.present?
            if current_community.latch.latch_locks.present?
              current_community.latch.latch_locks.destroy_all
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

    def parse_csv(file)
        @latch.import_data(file)
    end

    def destroy
        @latch  = EdgeState.find(params[:id])
        @latch.destroy
    end

    private
        def latch_params
            params.require(:latch).permit(:client_id, :client_secret, :community_id)
        end

        def set_user
            @is_already_exists = Latch.find_by(community_id: current_community.id).present?
        end

end
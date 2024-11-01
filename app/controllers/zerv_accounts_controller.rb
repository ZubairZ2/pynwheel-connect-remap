class ZervAccountsController < ApplicationController
    # include Error::ErrorHandler
    before_action :set_zerv, except: [:new, :create, :upload_lock_image]

    def new
        @zerv = Zerv.new
    end
    
    def create
      @zerv = Zerv.find_or_create_by(community_id: current_community.id)
      locks_provider = current_community.multiple_locks_provider
      locks_provider << "Zerv" unless locks_provider.include?("Zerv")
      if @zerv.errors.present?
        flash[:error] = @zerv.errors.full_messages.join(',')
      else
        @zerv.update(zerv_params)
        current_community.update(:multiple_locks_provider => locks_provider)
        flash[:notice] = ZervConstants::SAVED
      end

      redirect_to new_community_dwelo_path(current_community)
    end

    def upload_lock_image
      @zerv = current_community.zerv || Zerv.new(community_id: current_community.id)

      if params[:type].present? && params[:type] === "amenity"
        @zerv.update(amenity_lock_image: params[:amenity_lock_image]) if params[:amenity_lock_image].present?
      else
        @zerv.update(lock_image: params[:lock_image]) if params[:lock_image].present?
      end
    end

    def show_lock_image_in_modal
      @community = current_community
    end

    def test_zerv_connection
      result = ZervServices::ImportLockService.call(community: current_community, test_connection: true)
      result.present? ? (render  xml: result.success? ? result.payload : result.error) : (flash[:error] = ZervConstants::CONTCT_PROD)
    end

    def import_zerv_locks
      result = ZervServices::ImportLockService.call(community: current_community, test_connection: false)
      result.present? ? ( result.success? ? ( (result.payload["listGetDevices"].instance_of? String) ? flash[:error] = ZervConstants::NO_LOCKS : flash[:notice] = ZervConstants::LOCKS_IMPORTED) : flash[:error] = result.error ) : flash[:error] = ZervConstants::CONTCT_PROD
      redirect_to new_community_dwelo_path(current_community)
    end

    def remove_zerv_locks
      if current_community.zerv.zerv_locks.present?
        current_community.zerv.zerv_locks.destroy_all
        flash[:notice] =  ZervConstants::LOCKS_DELETED
      else
        flash[:error] = ZervConstants::NO_LOCKS
      end
      redirect_to new_community_dwelo_path(current_community)
    end

    def map_zerv_locks
      @zerv.map_locks_with_stops
      flash[:notice] =  ZervConstants::LOCKS_MATCHED
      redirect_to new_community_dwelo_path(current_community)
    end

    private

      def zerv_params
        params.require(:zerv).permit(:username, :password, :facility_id, :badge_id, :card_format, :lock_instruction_text, :amenity_lock_instruction_text)
      end

      def set_zerv
        @zerv = current_community.zerv

        unless @zerv.present?
          flash[:error] = ZervConstants::ENTER_CRED
          redirect_to new_community_dwelo_path(current_community)
        end
      end
end
module Api
  module SelfTour
    module V1
      class LatchAccountsController < BaseController
        before_action :load_community
        before_action :load_tour_user

        def generate_verification_code
          response = LatchOpenkit::LatchLocksService.new(@tour_user, @community.id).generate_latch_verification_code()
          render :json=> response
        end

        def get_user_auth_token
          response = LatchOpenkit::LatchLocksService.new(@tour_user, @community.id).generate_latch_sdk_token(params[:verification_code])
          render :json=> response
        end

        private

          def load_tour_user
            @tour_user = TourUser.find params[:tour_user_id]
            rescue ActiveRecord::RecordNotFound
              render json: {success: false, error_code: 404, message: 'Tour User not found', data: nil}, status: :not_found
          end

          def load_community
            @community = Community.find params[:community_id]
            rescue ActiveRecord::RecordNotFound
              render json: {success: false, error_code: 404, message: 'Community not found', data: nil}, status: :not_found
          end
      end
    end
  end
end
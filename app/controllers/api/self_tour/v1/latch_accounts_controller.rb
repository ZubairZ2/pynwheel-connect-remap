module Api
  module SelfTour
    module V1
      class LatchAccountsController < BaseController
        before_action :load_community
        before_action :load_tour_user

        def generate_verification_code
          response = LatchOpenkit::LatchLocksService.new(@tour_user, @community.id).generate_latch_verification_code()
          render json: response
        end

        def get_user_auth_token
          token_record = find_or_create_token
          render json: { access_token: token_record&.token }
        end

        private

          def load_tour_user
            @tour_user = TourUser.find params[:tour_user_id]
          rescue ActiveRecord::RecordNotFound
            render json: { success: false, error_code: 404, message: 'Tour User not found', data: nil }, status: :not_found
          end

          def load_community
            @community = Community.find params[:community_id]
          rescue ActiveRecord::RecordNotFound
            render json: { success: false, error_code: 404, message: 'Community not found', data: nil }, status: :not_found
          end

          def find_or_create_token
            existing_token = @tour_user.latch_auth_token
            return existing_token unless token_needs_refresh?(existing_token)

            create_new_token
          end

          def token_needs_refresh?(token_record)
            token_record.nil? || token_record.expired?
          end

          def create_new_token
            response = LatchOpenkit::LatchLocksService.new(@tour_user, @community.id).generate_latch_sdk_token(params[:verification_code])
            return unless response["access_token"].present?

            @tour_user.create_or_update_latch_auth_token(
              token: "#{response["token_type"]} #{response["access_token"]}",
              expires_at: Time.current + response["expires_in"]
            )
          end
      end
    end
  end
end

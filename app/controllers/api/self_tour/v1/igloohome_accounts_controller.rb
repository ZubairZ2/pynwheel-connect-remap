module Api
  module SelfTour
    module V1
      class IgloohomeAccountsController < BaseController
        before_action :load_community
        before_action :load_tour_user
        before_action :load_required_attributes

        def get_pin_code
          response = IgloohomeLockService.new(@community.id, @current_time, @tour_user.id).generate_hourly_pin(@device_id, @access_name, @start_time, @end_time)
          render :json=> response

        rescue => error
          render :json=> error
        end

        private

          def load_required_attributes
            @current_time = Time.now.in_time_zone(@community.get_time_zone())
            @start_time = @current_time.strftime("%Y-%m-%dT%H:00:00%:z")
            @end_time = (@current_time + 3.hours).strftime("%Y-%m-%dT%H:00:00%:z")
            @device_id = params[:device_id]
            @access_name = params[:access_name]
          end

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
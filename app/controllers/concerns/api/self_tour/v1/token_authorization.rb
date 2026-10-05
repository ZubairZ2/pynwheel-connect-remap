# frozen_string_literal: true

module Api
  module SelfTour
    module V1
      # The self-tour API's token check, extracted from
      # `Api::SelfTour::V1::CommunitiesController` without change so the new
      # wayfinding endpoints use the same rule: `ENV["API_ACCESS"] == "true"`
      # (`ApplicationHelper#api_access`) or a JWT whose `tour_user_id` is the
      # `tour_user_id` parameter (`#decoded`, `#grant_access`).
      module TokenAuthorization
        extend ActiveSupport::Concern

        included do
          include ApplicationHelper
          before_action :check_authorization
          before_action :load_community
        end

        private

          def check_authorization
            has_access = (api_access || grant_access(decoded(params[:token]), params[:tour_user_id])) rescue false
            render json: { message: "Invalid Token, Not Authorized!", success_code: 401, status: false } unless has_access
          end

          def load_community
            @community = Community.find(params[:community_id])
          end
      end
    end
  end
end

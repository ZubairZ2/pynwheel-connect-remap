# frozen_string_literal: true

module Api
  module TourApp
    module V1
      # The endpoints under /properties/:property_id: the property must exist
      # and be visible to the user (404), and its Self-Guided Tour must be on
      # (422 `tour_disabled`) before any graph is built.
      class PropertyController < BaseController
        before_action :load_property!
        before_action :require_tour!

        private

          def load_property!
            @property = TourApi::Properties.find!(@auth, params[:property_id])
          end

          def require_tour!
            TourApi::Properties.require_tour!(@property)
          end

          def built
            @built ||= TourApi::Engine.built(@property)
          end

          def payload
            @payload ||= TourApi::Engine.payload(built, request.base_url)
          end
      end
    end
  end
end

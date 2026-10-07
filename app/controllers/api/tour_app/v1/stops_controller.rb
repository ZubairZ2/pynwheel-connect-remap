# frozen_string_literal: true

module Api
  module TourApp
    module V1
      # Build Your Tour: the units and amenities on the property's stops list
      # (the CMS's "Show in Stops List" state), grouped as the app shows them.
      class StopsController < PropertyController
        def index
          render json: TourApi::Stops.list(@property, built)
        end
      end
    end
  end
end

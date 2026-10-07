# frozen_string_literal: true

module Api
  module TourApp
    module V1
      class PropertiesController < BaseController
        # The properties the signed-in user may tour, with the Self-Guided Tour
        # flag resolved server-side; `?q=` filters by name, city or address,
        # `?tour_enabled=true` keeps the tourable ones.
        def index
          tour_only = boolean_param(params[:tour_enabled], default: false, loc: %w[query tour_enabled])
          query = string_param(params[:q], loc: %w[query q], max: 120, required: false)
          rows = TourApi::Properties.list(@auth, query: query, tour_only: tour_only)
          render json: { success: true, properties: rows, total: rows.size }
        end

        # One property and its Self-Guided Tour state (counts, buildings, the
        # tour summary and the current graph version when the tour is on).
        def show
          community = TourApi::Properties.find!(@auth, params[:property_id])
          built = nil
          stops = nil
          if Connect::ProductState.tour?(community)
            built = TourApi::Engine.built(community)
            stops = TourApi::Stops.list(community, built)
          end
          render json: TourApi::Properties.detail(community, built: built, stops: stops)
        end
      end
    end
  end
end

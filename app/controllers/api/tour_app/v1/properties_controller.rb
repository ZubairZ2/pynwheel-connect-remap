# frozen_string_literal: true

module Api
  module TourApp
    module V1
      class PropertiesController < BaseController
        # The properties the signed-in user may tour, with the Self-Guided Tour
        # flag resolved server-side; `?q=` filters by name, city or address,
        # `?tour_enabled=true` keeps the tourable ones; `?near=lat,lng`
        # (with `radius_km`, `limit`) keeps those near the phone, nearest
        # first, with `distance_m` (October 28, 2026).
        def index
          tour_only = boolean_param(params[:tour_enabled], default: false, loc: %w[query tour_enabled])
          query = string_param(params[:q], loc: %w[query q], max: 120, required: false)
          near = near_param(params[:near])
          radius_km = ::Visits::Rules.coordinate(params[:radius_km], loc: %w[query radius_km], range: 0.1..TourApi::Properties::NEAR_RADIUS_KM)
          limit = integer_param(params[:limit], loc: %w[query limit])
          raise TourApi::ApiError.validation([{ loc: %w[query limit], message: "Input should be between 1 and #{TourApi::Properties::NEAR_LIMIT_MAX}" }]) if limit && !(1..TourApi::Properties::NEAR_LIMIT_MAX).cover?(limit)

          rows = TourApi::Properties.list(@auth, query: query, tour_only: tour_only, near: near, radius_km: radius_km, limit: limit)
          render json: { success: true, properties: rows, total: rows.size }
        end

        private

          # `near=lat,lng` as the phone sends it: both numbers, each in range.
          def near_param(raw)
            return nil if raw.nil? || raw == ''

            parts = raw.to_s.split(',', -1).map(&:strip)
            raise TourApi::ApiError.validation([{ loc: %w[query near], message: 'Input should be "latitude,longitude"' }]) unless parts.size == 2

            [::Visits::Rules.coordinate(parts[0], loc: %w[query near], range: -90.0..90.0), ::Visits::Rules.coordinate(parts[1], loc: %w[query near], range: -180.0..180.0)].tap do |pair|
              raise TourApi::ApiError.validation([{ loc: %w[query near], message: 'Input should be "latitude,longitude"' }]) if pair.any?(&:nil?)
            end
          end

        public

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
          render json: TourApi::Properties.detail(community, built: built, stops: stops, auth: @auth).merge(capabilities: Connect::Flags.tour_capabilities)
        end
      end
    end
  end
end

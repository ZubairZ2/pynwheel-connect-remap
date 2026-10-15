# frozen_string_literal: true

module Api
  module TourApp
    module V1
      # Smart locks on the tour's stops: a door code for one stop, issued
      # through the property's igloohome account exactly as the legacy
      # Pynwheel Tour app had it (`TourApi::Locks`). Which stop carries which
      # lock is part of the stops list (`lock` on each stop).
      class LocksController < PropertyController
        def pin
          stop_id = string_param(params[:stop_id], loc: %w[body stop_id], min: 3, max: 64)
          render json: TourApi::Locks.pin!(@property, built, stop_id)
        end
      end
    end
  end
end

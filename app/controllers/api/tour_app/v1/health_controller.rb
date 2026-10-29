# frozen_string_literal: true

module Api
  module TourApp
    module V1
      # Liveness and database reachability; no token needed. `capabilities`
      # tells the app which optional server features are switched on
      # (visit recording, visitor sign-in, a required location) before anyone
      # signs in; `server_time` lets the app notice a phone clock that is off.
      class HealthController < BaseController
        skip_before_action :authenticate!

        def show
          database = begin
            ActiveRecord::Base.connection.select_value('SELECT 1').to_i == 1
          rescue StandardError
            false
          end
          render json: { success: true, status: 'ok', database: database, env: Rails.env.to_s, server_time: TourApi::Text.timestamp(Time.now), capabilities: Connect::Flags.tour_capabilities }
        end
      end
    end
  end
end

# frozen_string_literal: true

module Api
  module TourApp
    module V1
      # Liveness and database reachability; no token needed.
      class HealthController < BaseController
        skip_before_action :authenticate!

        def show
          database = begin
            ActiveRecord::Base.connection.select_value('SELECT 1').to_i == 1
          rescue StandardError
            false
          end
          render json: { success: true, status: 'ok', database: database, env: Rails.env.to_s }
        end
      end
    end
  end
end

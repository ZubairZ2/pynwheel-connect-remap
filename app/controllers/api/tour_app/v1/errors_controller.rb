# frozen_string_literal: true

module Api
  module TourApp
    module V1
      # Anything else under /api/tour/v1 answers the API's own 404 envelope
      # instead of the CMS's HTML page.
      class ErrorsController < BaseController
        skip_before_action :authenticate!

        def not_found
          render json: { success: false, error: { code: 'not_found', message: 'Not Found' } }, status: :not_found
        end
      end
    end
  end
end

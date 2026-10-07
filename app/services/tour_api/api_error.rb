# frozen_string_literal: true

module TourApi
  # A deliberate, client-facing error of the Tour App API. Every error the
  # API answers has this one shape, whatever raised it:
  #
  #   {"success": false, "error": {"code", "message", "details"?}}
  #
  # Nothing internal (SQL, traces, table names) travels in it; unexpected
  # exceptions are answered as `internal_error` with a log reference by
  # Api::TourApp::V1::BaseController.
  class ApiError < StandardError
    attr_reader :status, :code, :details, :headers

    def initialize(status, code, message, details: nil, headers: {})
      super(message)
      @status = status
      @code = code
      @details = details
      @headers = headers
    end

    def body
      error = { code: code, message: message }
      error[:details] = details unless details.nil?
      { success: false, error: error }
    end

    class << self
      def unauthorized(code = 'unauthorized', message = 'Sign in to continue.')
        new(401, code, message, headers: { 'WWW-Authenticate' => 'Bearer' })
      end

      def forbidden(code = 'forbidden', message = 'You are not allowed to do that.')
        new(403, code, message)
      end

      def not_found(message = 'No such property.', code: 'not_found')
        new(404, code, message)
      end

      def unprocessable(code, message, details = nil)
        new(422, code, message, details: details)
      end

      # Request validation, phrased as the FastAPI service phrased it: a list
      # of `{loc: [...], message: ...}` entries.
      def validation(details)
        new(422, 'validation_error', 'The request is not valid.', details: Array(details))
      end
    end
  end
end

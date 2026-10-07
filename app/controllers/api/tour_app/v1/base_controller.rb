# frozen_string_literal: true

module Api
  module TourApp
    module V1
      # The Pynwheel Tour mobile app's API (`/api/tour/v1`), ported into Rails
      # on October 7, 2026 from the FastAPI service `tour-api/` with the same
      # contract. JSON only, no session, no CSRF: every request after sign-in
      # carries `Authorization: Bearer <token>`, a Doorkeeper access token of
      # a CMS Super Admin (`TourApi::Auth`). Every error is
      # `{"success": false, "error": {"code", "message", "details"?}}`;
      # an unexpected exception is logged with a reference and answered as
      # `internal_error`, never with a trace.
      #
      # Separate from the legacy self-tour API (`Api::SelfTour::V1`, JWT /
      # API_ACCESS) and from `Api::V1` (vendor endpoints), which are untouched.
      class BaseController < ActionController::API
        rescue_from StandardError, with: :render_internal_error
        rescue_from TourApi::ApiError, with: :render_api_error
        rescue_from ActionController::ParameterMissing do |error|
          render_api_error(TourApi::ApiError.validation([{ loc: ['body', error.param.to_s], message: 'Field required' }]))
        end

        before_action :authenticate!

        private

          def authenticate!
            @auth = TourApi::Auth.authenticate(bearer_token)
          end

          def bearer_token
            scheme, value = request.authorization.to_s.split(' ', 2)
            scheme&.casecmp?('bearer') ? value.to_s.strip.presence : nil
          end

          def render_api_error(error)
            error.headers.each { |name, value| response.headers[name] = value }
            render json: error.body, status: error.status
          end

          def render_internal_error(error)
            ref = SecureRandom.hex(6)
            Rails.logger.error("[tour-api] internal_error ref=#{ref} #{request.method} #{request.path} #{error.class}: #{error.message}\n#{Array(error.backtrace).first(20).join("\n")}")
            render json: { success: false, error: { code: 'internal_error', message: 'Something went wrong on our side.', details: { ref: ref } } }, status: :internal_server_error
          end

          # A query or body boolean as the previous service parsed it (true/false/1/0/yes/no/on/off/t/f/y/n).
          def boolean_param(raw, default:, loc:)
            return default if raw.nil?
            return raw if raw == true || raw == false

            case raw.to_s.strip.downcase
            when 'true', '1', 'yes', 'on', 't', 'y' then true
            when 'false', '0', 'no', 'off', 'f', 'n' then false
            else raise TourApi::ApiError.validation([{ loc: loc, message: 'Input should be a valid boolean, unable to interpret input' }])
            end
          end

          def integer_param(raw, loc:)
            return nil if raw.nil? || raw == ''
            return raw if raw.is_a?(Integer)
            return raw.to_i if raw.is_a?(Float) && raw == raw.floor
            return raw.to_s.to_i if raw.to_s.match?(/\A\s*[+-]?\d+\s*\z/)

            raise TourApi::ApiError.validation([{ loc: loc, message: 'Input should be a valid integer, unable to parse string as an integer' }])
          end

          def string_param(raw, loc:, min: 0, max: nil, required: true)
            if raw.nil?
              raise TourApi::ApiError.validation([{ loc: loc, message: 'Field required' }]) if required

              return nil
            end
            raise TourApi::ApiError.validation([{ loc: loc, message: 'Input should be a valid string' }]) unless raw.is_a?(String)
            raise TourApi::ApiError.validation([{ loc: loc, message: "String should have at least #{min} characters" }]) if raw.length < min
            raise TourApi::ApiError.validation([{ loc: loc, message: "String should have at most #{max} characters" }]) if max && raw.length > max

            raw
          end

          def string_list_param(raw, loc:, min: 1, max: 100)
            raise TourApi::ApiError.validation([{ loc: loc, message: 'Field required' }]) if raw.nil?
            raise TourApi::ApiError.validation([{ loc: loc, message: 'Input should be a valid list' }]) unless raw.is_a?(Array)
            raise TourApi::ApiError.validation([{ loc: loc, message: "List should have at least #{min} item after validation, not #{raw.size}" }]) if raw.size < min
            raise TourApi::ApiError.validation([{ loc: loc, message: "List should have at most #{max} items after validation, not #{raw.size}" }]) if raw.size > max

            raw.each_with_index do |item, i|
              raise TourApi::ApiError.validation([{ loc: loc + [i], message: 'Input should be a valid string' }]) unless item.is_a?(String)
            end
            raw
          end

          # `If-None-Match` against the strong ETag we answer (a weak or listed form is accepted too).
          def etag_matches?(etag)
            request.headers['If-None-Match'].to_s.split(',').map(&:strip).any? { |value| value == etag || value == "W/#{etag}" || value == '*' }
          end
      end
    end
  end
end

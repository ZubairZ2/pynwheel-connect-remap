# frozen_string_literal: true

module Api
  module TourApp
    module V1
      # Sign in with Pynwheel CMS credentials, sign out, who am I.
      #
      # `login` is the CMS's own Doorkeeper password grant, run in-process:
      # `Doorkeeper::Helpers::Controller#server` makes this controller the
      # strategy's context, so `resource_owner_from_credentials` (Devise:
      # `find_for_database_authentication` + `valid_password?`) verifies the
      # password exactly as `POST /api/v2/auth/token` does, and the token is
      # minted by Doorkeeper. Only a Super Admin is then admitted; any other
      # account's token is revoked on the spot.
      class AuthController < BaseController
        include Doorkeeper::Helpers::Controller

        skip_before_action :authenticate!, only: :login

        EMAIL = /\A[^@\s]+@[^@\s]+\z/

        def login
          validate_login!
          granted = server.token_request('password').authorize
          context = TourApi::Auth.login(granted)
          Rails.logger.info("[tour-api] login ok user_id=#{context.user.id}")
          render json: { success: true, access_token: context.token.plaintext_token, token_type: 'bearer',
                         expires_at: TourApi::Text.timestamp(context.expires_at), user: context.user_json }
        end

        def logout
          revoked = TourApi::Auth.logout(@auth)
          Rails.logger.info("[tour-api] logout user_id=#{@auth.user.id} revoked=#{revoked}")
          render json: { success: true, revoked: revoked }
        end

        def me
          render json: { success: true, user: @auth.user_json, expires_at: TourApi::Text.timestamp(@auth.expires_at) }
        end

        private

          def validate_login!
            errors = []
            email = params[:email]
            password = params[:password]
            if !email.is_a?(String) || email.blank?
              errors << { loc: %w[body email], message: 'Field required' }
            elsif email.length > 254
              errors << { loc: %w[body email], message: 'String should have at most 254 characters' }
            elsif email.strip.length < 3 || !EMAIL.match?(email.strip.downcase)
              errors << { loc: %w[body email], message: 'Value error, must be an email address' }
            end
            if !password.is_a?(String) || password.empty?
              errors << { loc: %w[body password], message: 'Field required' }
            elsif password.length > 256
              errors << { loc: %w[body password], message: 'String should have at most 256 characters' }
            end
            raise TourApi::ApiError.validation(errors) if errors.any?
          end
      end
    end
  end
end

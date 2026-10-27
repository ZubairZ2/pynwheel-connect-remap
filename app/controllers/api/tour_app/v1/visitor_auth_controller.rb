# frozen_string_literal: true

module Api
  module TourApp
    module V1
      # The visitor (prospect) sign-in of the Tour App (October 23, 2026):
      #   POST   /visitor/otp         {phone, country_code?, property_id?}   → 202, always the same body
      #   POST   /visitor/otp/verify  {phone, code, first_name?, last_name?, email?, property_id?}
      #                               → the `vst_` session token, the visitor and their bookings
      #   GET    /visitor/me          the visitor, their bookings and their open visit
      #   PUT    /visitor/me          {first_name, last_name, email, is_sms_enabled}
      #   POST   /visitor/logout      revokes this session
      #   DELETE /visitor/me          the visitor deletes their account (the legacy app's delete_account)
      # Every route is 404 `disabled` while PYN_TOUR_VISITOR_AUTH is off.
      # Throttled by Rack::Attack per phone and per address.
      class VisitorAuthController < BaseController
        skip_before_action :authenticate!, only: %i[otp verify]
        before_action :require_enabled!
        before_action :require_visitor!, only: %i[me update logout destroy]

        def otp
          phone = string_param(params[:phone], loc: %w[body phone], min: 7, max: 32)
          country = string_param(params[:country_code], loc: %w[body country_code], max: 3, required: false)
          result = Visitors::Otp.request!(phone: phone, country_code: country, ip: request.remote_ip)
          render json: { success: true }.merge(result), status: :accepted
        end

        def verify
          phone = string_param(params[:phone], loc: %w[body phone], min: 7, max: 32)
          code = string_param(params[:code], loc: %w[body code], min: 4, max: 12)
          country = string_param(params[:country_code], loc: %w[body country_code], max: 3, required: false)
          profile = params.permit(:first_name, :last_name, :email).to_h
          visitor = Visitors::Otp.verify!(phone: phone, code: code, profile: profile, country_code: country)
          token, session = Visitors::Session.issue!(visitor, community_id: property_id_param, ip: request.remote_ip, user_agent: request.user_agent)
          community = property_id_param && Community.find_by(id: property_id_param)
          TourApi::Audit.record(community, 'visitor_login', whodunnit: "visitor:#{visitor.id}", payload: { tour_user_id: visitor.id, session_id: session.id }) if community
          Rails.logger.info("[tour-api] visitor login ok tour_user_id=#{visitor.id} session_id=#{session.id}")
          render json: { success: true, access_token: token, token_type: 'bearer', expires_at: TourApi::Text.timestamp(session.expires_at),
                         visitor: TourApi::Auth.visitor_json(visitor), bookings: TourApi::Visits.visitor_bookings(visitor), capabilities: Connect::Flags.tour_capabilities }
        end

        def me
          visitor = @auth.visitor
          render json: { success: true, visitor: TourApi::Auth.visitor_json(visitor), expires_at: TourApi::Text.timestamp(@auth.expires_at),
                         bookings: TourApi::Visits.visitor_bookings(visitor), open_visit: open_visit_json(visitor), capabilities: Connect::Flags.tour_capabilities }
        end

        def update
          visitor = @auth.visitor
          attrs = {}
          attrs[:first_name] = string_param(params[:first_name], loc: %w[body first_name], min: 1, max: 80, required: false) if params.key?(:first_name)
          attrs[:last_name] = string_param(params[:last_name], loc: %w[body last_name], min: 1, max: 80, required: false) if params.key?(:last_name)
          attrs[:email] = string_param(params[:email], loc: %w[body email], min: 3, max: 254, required: false)&.strip&.downcase if params.key?(:email)
          attrs[:is_sms_enabled] = boolean_param(params[:is_sms_enabled], default: visitor.is_sms_enabled, loc: %w[body is_sms_enabled]) if params.key?(:is_sms_enabled)
          attrs.compact!
          visitor.assign_attributes(attrs)
          visitor.name = "#{visitor.first_name} #{visitor.last_name}".strip if attrs.key?(:first_name) || attrs.key?(:last_name)
          unless visitor.save
            raise TourApi::ApiError.validation(visitor.errors.map { |e| { loc: ['body', e.attribute.to_s], message: e.message } })
          end

          render json: { success: true, visitor: TourApi::Auth.visitor_json(visitor) }
        end

        def logout
          revoked = TourApi::Auth.logout(@auth)
          Rails.logger.info("[tour-api] visitor logout tour_user_id=#{@auth.visitor.id} revoked=#{revoked}")
          render json: { success: true, revoked: revoked }
        end

        # The legacy app's `delete_account`, through the model's own
        # `dependent: :destroy` chain (bookings cancel their CRM appointments
        # as the legacy page does); every session is revoked first.
        def destroy
          visitor = @auth.visitor
          Visitors::Session.revoke_all!(visitor)
          ApplicationRecord.transaction { visitor.destroy! }
          Rails.logger.info("[tour-api] visitor account deleted tour_user_id=#{visitor.id}")
          render json: { success: true, deleted: visitor.id }
        end

        private

          def require_enabled!
            raise TourApi::ApiError.new(404, 'disabled', 'Visitor sign-in is not available on this server.') unless Connect::Flags.tour_visitor_auth_enabled?
          end

          def property_id_param
            raw = params[:property_id]
            raw.to_s.match?(/\A\d+\z/) ? raw.to_i : nil
          end

          def open_visit_json(visitor)
            visit = TourHistory.where(tour_user_id: visitor.id, left: nil, source: 'tour_app').where('arrived > ?', Time.current - Visitors::Status::ACTIVE_WINDOW).order(:id).last
            return nil if visit.nil?

            community = Community.find_by(id: visit.community_id)
            community ? TourApi::Visits.visit_json(community, visit).merge(property_id: community.id, property_name: community.name) : nil
          end
      end
    end
  end
end

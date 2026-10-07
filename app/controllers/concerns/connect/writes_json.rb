# frozen_string_literal: true

module Connect
  # The Pynwheel Connect write endpoints (`HallwaysController#save_graph`,
  # `ToursController#save_setup` / `#stop_list`): JSON PUTs on the owning
  # legacy controllers, isolated from every legacy action by the one
  # predicate `connect_write?` (JSON format and an action named in the
  # controller's `CONNECT_WRITE_ACTIONS`).
  #
  # For those actions only:
  #   - the kill switch `Connect::Flags.writes_enabled?` answers 404 `disabled`;
  #   - the property is loaded read-only (no Tour creation, no chat sidebar);
  #   - the CSRF token is verified with a real check that answers 403
  #     `{code: 'csrf'}` instead of the default `:null_session` (which would
  #     empty the session and surface as a sign-out); the legacy actions keep
  #     the default;
  #   - `User#can_edit_map?` answers 403 `forbidden` (the legacy map pages run
  #     no per-property check; hardening them is a separate ticket);
  #   - the service errors become 409 / 422 / 404 envelopes.
  module WritesJson
    extend ActiveSupport::Concern

    included do
      skip_before_action :verify_authenticity_token, if: :connect_write?
      skip_before_action :community_code, if: :connect_write?
      skip_before_action :load_tour_users_chats, if: :connect_write?
      before_action :verify_connect_authenticity!, if: :connect_write?
      before_action :load_connect_write_community, if: :connect_write?
      before_action :authorize_connect_map_edit!, if: :connect_write?

      rescue_from Wayfinding::Invalid, with: :render_connect_invalid
      rescue_from Wayfinding::StaleVersion, with: :render_connect_stale
      rescue_from Wayfinding::NotFound, with: :render_connect_not_found
    end

    private

      def connect_write?
        request.format.json? && self.class::CONNECT_WRITE_ACTIONS.include?(action_name)
      end

      def verify_connect_authenticity!
        return if verified_request?

        render_connect_error(:forbidden, code: 'csrf', message: 'The form token is missing or stale.')
      end

      def load_connect_write_community
        @community = Community.find_by_id(params[:community_id])
        return render_connect_error(:not_found, code: 'not_found', message: 'No such property.') if @community.nil?
        return render_connect_error(:not_found, code: 'disabled', message: 'Connect writes are turned off for this property.') unless Connect::Flags.writes_enabled?(@community)

        current_community
      end

      def authorize_connect_map_edit!
        return if current_user&.can_edit_map?(@community)

        render_connect_error(:forbidden, code: 'forbidden', message: 'You may not change this property\'s map.')
      end

      def connect_write_meta(extra = {})
        {
          current_user: Connect::ResponseEnvelope.current_user_meta(current_user),
          csrf_token: form_authenticity_token,
          property: { id: @community.id, name: @community.name, company_id: @community.company_id }
        }.merge(extra)
      end

      def render_connect_error(status, code:, message:, data: nil, extra: {})
        render json: { data: data, meta: (@community ? connect_write_meta : {}), flash_messages: [], errors: [{ code: code, message: message }.merge(extra)] }, status: status
      end

      def render_connect_invalid(error)
        render json: { data: nil, meta: connect_write_meta, flash_messages: [], errors: error.errors }, status: :unprocessable_entity
      end

      def render_connect_stale(error)
        render_connect_error(:conflict, code: 'stale_version', message: 'The map changed since it was loaded. Reload to continue.',
                             data: connect_stale_data, extra: { base_version: error.base_version, current_version: error.current_version, changed_by: error.changed_by, changed_at: error.changed_at })
      end

      def render_connect_not_found(error)
        render_connect_error(:not_found, code: 'not_found', message: error.message)
      end

      # Overridden by a controller that can hand the current state back on a 409.
      def connect_stale_data
        nil
      end
  end
end

# frozen_string_literal: true

module Connect
  # The Pynwheel Connect read endpoints of the Tour Setup modules
  # (Connect::LocksController#index, StopsController#index, VisitorsController#index …):
  # JSON GETs on their own controllers, isolated from the legacy pages the same
  # way Connect::InventoryJson and Connect::WayfindingJson are:
  #   - `community_code` (a write on a read: it creates the Tour and the
  #     SchedulerWidgetSetting) and the chat sidebar loader are skipped;
  #   - the property is loaded read-only, and an id the signed-in user may not
  #     see answers 404 (the rule of ApplicationController#check_community,
  #     `User#can_access_community?`), so a property id cannot be changed to
  #     read another company's stops, locks, visitors or settings.
  #
  # `render_connect_error` comes from Connect::WritesJson; a controller
  # includes both (Connect::BaseController).
  module ReadsJson
    extend ActiveSupport::Concern

    included do
      skip_before_action :community_code, if: :connect_read?
      skip_before_action :load_tour_users_chats, if: :connect_read?
      before_action :load_connect_read_community, if: :connect_read?
      before_action :authorize_connect_read!, if: :connect_read?
    end

    private

      def connect_read?
        request.format.json? && self.class::CONNECT_READ_ACTIONS.include?(action_name)
      end

      def load_connect_read_community
        @community = Community.find_by_id(params[:community_id])
        render_connect_error(:not_found, code: 'not_found', message: 'No such property.') if @community.nil?
      end

      # A property outside the user's scope reads as "not found", as the
      # inventory listings answer it (a redirect there, a 404 here).
      def authorize_connect_read!
        return if current_user&.can_access_community?(@community.id)

        render_connect_error(:not_found, code: 'not_found', message: 'No such property.')
      end

      # What every Tour Setup read carries: who is signed in, the property, the
      # token the writes verify, and whether this user and property may write.
      def connect_read_meta(extra = {})
        {
          current_user: Connect::ResponseEnvelope.current_user_meta(current_user),
          csrf_token: form_authenticity_token,
          property: { id: @community.id, name: @community.name, company_id: @community.company_id, company_name: @community.company&.name, time_zone: @community.get_time_zone },
          writes_enabled: Connect::Flags.writes_enabled?(@community),
          can_edit: current_user&.can_edit_map?(@community) == true,
          is_super_admin: current_user&.is_super_admin? == true
        }.merge(extra)
      end

      def render_connect(data, extra_meta = {})
        render json: Connect::ResponseEnvelope.new(data: data, meta: connect_read_meta(extra_meta)).as_json
      end
  end
end

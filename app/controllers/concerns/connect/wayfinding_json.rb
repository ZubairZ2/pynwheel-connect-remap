module Connect
  # Read-only JSON for the Pynwheel Connect "Map & Plotting" screen.
  #
  # The legacy Auto Wayfinding page (AutomatePlottingController#index) works
  # from the property's pathway graph (hallways), elevators, building
  # entry/exit points, the tour's starting point and its stops. `#shortest_path`
  # runs the routing algorithm over that data and already answers JSON. Both
  # actions now answer `format.json` for Connect with the records they read,
  # in the Connect envelope. The HTML page, its queries and its output are
  # unchanged.
  #
  # Three ApplicationController callbacks are handled differently, for these
  # JSON reads only:
  #   - `community_code` creates the property's Tour and SchedulerWidgetSetting
  #     when they are missing: a write on a read, skipped as the inventory
  #     JSON skips it. It is also what loads `@community` for `#shortest_path`,
  #     so `load_connect_community` does that part (read-only) instead.
  #   - `load_tour_users_chats` loads the HTML layout's chat sidebar.
  #   - `check_community`, which the HTML page does not run, scopes the JSON to
  #     the properties the signed-in user may see, as every other Connect read
  #     does (a redirect for another company's property, which Connect shows as
  #     "not found").
  #
  # The HTML `#index` also saves a hallway on the way (`make_sure_one_selected_hallway`);
  # the JSON branch returns before it, so it never runs for Connect.
  module WayfindingJson
    extend ActiveSupport::Concern

    included do
      skip_before_action :community_code, if: :connect_wayfinding_json?
      skip_before_action :load_tour_users_chats, if: :connect_wayfinding_json?
      before_action :load_connect_community, if: :connect_wayfinding_json?
      before_action :check_community, if: :connect_wayfinding_json?
    end

    private

      # One combined predicate on purpose (see Connect::InventoryJson).
      def connect_wayfinding_json?
        request.format.json? && %w[index shortest_path].include?(action_name)
      end

      # What `community_code` → `current_community` would have set, without the
      # session write and the Tour creation. An unknown id is a 404 in JSON
      # rather than the RecordNotFound the HTML path raises.
      def load_connect_community
        @community = Community.find_by_id(params[:community_id])
        head :not_found if @community.nil?
      end

      def render_connect_wayfinding
        render json: Connect::ResponseEnvelope.new(
          data: Connect::WayfindingSerializer.new(@community, base_url: request.base_url).as_json,
          meta: Connect::ResponseEnvelope.listing_meta(
            current_user,
            1,
            extra: {
              property: {
                id: @community.id,
                name: @community.name,
                company_id: @community.company_id,
                company_name: @community.company&.name
              },
              # The compare-and-swap versions the Connect saves send back, the
              # token they carry, and whether this user and property may save.
              versions: Connect::WayfindingSerializer.versions(@community),
              csrf_token: form_authenticity_token,
              writes_enabled: Connect::Flags.writes_enabled?(@community),
              can_edit_map: current_user&.can_edit_map?(@community) == true
            }
          )
        ).as_json
      end

      # GET /automate_plotting/shortest_path.json?community_id=&from=&to=&step_free=&from_floor=&to_floor=
      def render_connect_route
        step_free = %w[1 true yes].include?(params[:step_free].to_s.downcase)
        avoid_blockers = !%w[0 false no].include?(params[:avoid_blockers].to_s.downcase)
        service = Wayfinding::RouteService.new(@community, from: params[:from].to_s, to: params[:to].to_s, step_free: step_free, avoid_blockers: avoid_blockers,
                                               from_floor: params[:from_floor].presence, to_floor: params[:to_floor].presence)
        result = service.call
        version = Wayfinding::GraphVersion.for(@community)
        render json: Connect::ResponseEnvelope.new(
          data: Wayfinding::RouteSerializer.new(result, version: version, step_free: step_free, avoid_blockers: avoid_blockers).as_json,
          meta: Connect::ResponseEnvelope.listing_meta(current_user, 1, extra: { property: { id: @community.id, name: @community.name } })
        ).as_json, status: result.ok ? :ok : :unprocessable_entity
      end
  end
end

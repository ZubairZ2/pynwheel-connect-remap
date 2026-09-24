module Connect
  # Read-only JSON for the Pynwheel Connect "Property Inventory" screen.
  #
  # The four legacy inventory listings (floorplates, floorplans, units and
  # amenities) answer `format.json` with the records their `index` action
  # already loads, wrapped in the Connect envelope. Nothing else about those
  # actions changes: the HTML path, their queries and their authorization
  # (`authenticate_user!`, `check_community`) all run exactly as before.
  #
  # Two ApplicationController callbacks are skipped, for these JSON reads only:
  #   - `community_code` creates the property's Tour and SchedulerWidgetSetting
  #     when they are missing. Connect's inventory is read-only, so reading it
  #     must not write anything.
  #   - `load_tour_users_chats` loads the chat sidebar of the HTML layout, which
  #     a JSON response never renders.
  module InventoryJson
    extend ActiveSupport::Concern

    included do
      skip_before_action :community_code, if: :connect_inventory_json?
      skip_before_action :load_tour_users_chats, if: :connect_inventory_json?
    end

    private

      # One condition rather than `only: :index, if: ...`: a skip that carries
      # both is skipped when *either* holds, which would reach every JSON action.
      def connect_inventory_json?
        action_name == 'index' && request.format.json?
      end

      def render_connect_inventory(data, community, extra: {})
        render json: Connect::ResponseEnvelope.new(
          data: data,
          meta: Connect::ResponseEnvelope.listing_meta(
            current_user,
            data.size,
            extra: { property: connect_property_meta(community) }.merge(extra)
          )
        ).as_json
      end

      # Just enough for the screen's breadcrumb and header, so the inventory
      # never has to walk the Properties listing to find its property's name.
      def connect_property_meta(community)
        {
          id: community.id,
          name: community.name,
          company_id: community.company_id,
          company_name: community.company&.name
        }
      end
  end
end

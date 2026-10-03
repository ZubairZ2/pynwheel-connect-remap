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

      # `pagination` and `total_count` are given when the listing answers one
      # page of a larger set (the Units tab); otherwise `data` is the whole set.
      def render_connect_inventory(data, community, extra: {}, pagination: nil, total_count: nil)
        render json: Connect::ResponseEnvelope.new(
          data: data,
          meta: Connect::ResponseEnvelope.listing_meta(
            current_user,
            total_count || data.size,
            pagination: pagination,
            extra: { property: connect_property_meta(community) }.merge(extra)
          )
        ).as_json
      end

      # The lock devices the unit form offers (AssignLocksHelper#all_locks), one
      # list across vendors. A vendor record with a missing name makes that helper
      # raise; the listings must still load when it does.
      def connect_lock_devices(community)
        all_locks(community).flat_map do |kind, locks|
          vendor = kind.to_s.delete_suffix("_locks")
          locks.map { |lock| { vendor: vendor, id: lock[:id], name: lock[:name], stop_id: lock[:stop_id] } }
        end
      rescue StandardError => e
        Rails.logger.warn("[Connect] lock devices unavailable for community #{community.id}: #{e.class}: #{e.message}")
        []
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

# The CMS screen for a property's map analytics data layer (PYN-1655).
#
# Replaces the Rails console write that was the only way to enable a client.
#
# Super admin only. This setting decides what leaves our systems and lands in a
# third party's Google Analytics, so it sits with SVG Maps Optimizer rather than
# with the per-property settings a company admin edits. Widening it later is one
# line in #require_super_admin and one in the sidebar partial.
class MapAnalyticsSettingsController < ApplicationController
  before_action :authenticate_user!
  before_action :require_super_admin
  before_action :set_community

  def show
    @config          = Analytics::MapEventContract.data_layer_config(@community)
    @known_actions   = Analytics::MapEventContract::KNOWN_ACTIONS
    @default_actions = Analytics::MapEventContract::DEFAULT_DATA_LAYER_ACTIONS
    # Which internal events feed each published action, so the screen can explain
    # what a client will actually receive rather than just naming it.
    @events_by_action = events_by_action
    # The origin the map's iframe is served from. It goes into the client's relay
    # snippet as the security check, so a wrong value silently drops every event
    # and a wildcard lets any site forge them. Set PYN_MAP_EMBED_ORIGIN once per
    # environment; the screen refuses to print a snippet without it rather than
    # guessing a host.
    @embed_origin = ENV["PYN_MAP_EMBED_ORIGIN"].presence
  end

  def update
    settings = @community.map_analytics_settings.presence || {}

    settings["data_layer"] = {
      "enabled"       => params[:enabled] == "1",
      # Intersected with the contract on the way in as well as on the way out.
      # A stored value that is not a known action could only come from a stale
      # form or a hand-edited row, and neither should reach a client's GA4.
      "actions"       => Array(params[:actions]).map(&:to_s) & Analytics::MapEventContract::KNOWN_ACTIONS,
      "target_origin" => params[:target_origin].to_s.strip.presence
    }

    @community.update!(map_analytics_settings: settings)

    redirect_to community_map_analytics_setting_path(@community),
                notice: "Analytics settings saved. They take effect on the next map load."
  rescue StandardError => e
    redirect_to community_map_analytics_setting_path(@community),
                alert: "Could not save: #{e.message}"
  end

  private

  def set_community
    @community = Community.find(params[:community_id])
  end

  def require_super_admin
    return if current_user&.is_super_admin?

    redirect_to root_path, alert: "You are not authorised to view that page."
  end

  # Inverts the contract's event-to-action map. Built here rather than stored,
  # so it can never disagree with what the pipeline actually emits.
  def events_by_action
    Analytics::MapEventContract::ACTIONS.each_with_object(Hash.new { |h, k| h[k] = [] }) do |(event, value), acc|
      if value.is_a?(Hash)
        value[:map].each_value { |action| acc[action] << event }
      else
        acc[value] << event
      end
    end
  end
end

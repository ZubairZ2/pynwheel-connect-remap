class MapUrlsController < ApplicationController
  before_action :require_map_urls_access

  # The map reads four query params (see WebpagesController#index). The page
  # offers one filter per param and builds the url client-side; with nothing
  # selected the default is the plain marketing map url.
  def index
    source          = current_community.map_url_source
    @base_url       = source[:base_url]
    @embed_template = source[:embed_template]
    @floors         = current_community.has_floorplates? ? current_community.property_floor_numbers : []
    @partners       = Community::MAP_PARTNERS
    # Touch (kiosk) urls are internal: only the Pynwheel admin role (stored as
    # "Super admin") may hand them out. require_map_urls_access has already
    # guaranteed current_user, and the view leaves the option out entirely when
    # this is false, so the markup never reaches anyone else.
    @touch_allowed  = current_user.is_super_admin?
    # Orientation and Page only exist on the SDK map, so the filters for them
    # are left out entirely for communities still on the legacy map.
    @sdk_map        = current_community.enable_sdk_map?
  end

  private

  def require_map_urls_access
    return if current_community.present? && current_user.present? &&
              (current_user.is_super_admin? || current_user.is_community_admin? ||
               current_user.is_company_admin? || current_user.is_regional_admin?)

    redirect_to root_path, alert: "You are not authorized to view that page."
  end
end

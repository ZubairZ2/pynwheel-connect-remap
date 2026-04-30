class MapFiltersController < ApplicationController
  before_action :set_community
  before_action :set_map_filter

  def update
    respond_to do |format|
      if @map_filter.update(map_filter_params)
        SdkCacheService.invalidate_fetch_data(@community.id)
        format.html { redirect_to redirect_path_to(), notice: "Map filters configuration updated successfully!" }
        format.json { render json: { success: true } }
      else
        format.html { redirect_to redirect_path_to(), alert: "Couldn't save map filters configuration!"}
        format.json { render json: { success: false, errors: "Couldn't save map filters configuration!" }, status: :unprocessable_entity }
      end
    end
  end

private

  def redirect_path_to
    if @community.is_sitemap?
      plotexp_community_sitemaps_path(@community)
    else
      community_floorplates_path(@community)
    end
  end

  def set_map_filter
    @map_filter = MapFilter.find(params[:id])
  end

  def set_community
    @community = Community.find(params[:community_id])
  end

  def map_filter_params
    params.require(:map_filter).permit(
      :marketing_properties_enabled,
      :marketing_bedrooms_enabled,
      :marketing_pricing_enabled,
      :marketing_square_feet_enabled,
      :marketing_availability_enabled,
      :ops_properties_enabled,
      :ops_bedrooms_enabled,
      :ops_pricing_enabled,
      :ops_square_feet_enabled,
      :ops_availability_enabled,
      :marketing_units_tab_enabled,
      :marketing_floorplans_tab_enabled,
      :marketing_amenities_tab_enabled,
      :marketing_favorites_tab_enabled,
      :ops_units_tab_enabled,
      :ops_floorplans_tab_enabled,
      :ops_amenities_tab_enabled,
      :ops_favorites_tab_enabled
    )
  end
end
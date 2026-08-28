class MapFilter < ApplicationRecord
  belongs_to :community

  SORT_TOOLTIP = "This toggle controls the 'Sort by' option on the map for units & floor plans. " \
                 "When set to No, the sort control is hidden from the right rail; " \
                 "when Yes, users can sort units/floorplans.".freeze

  FLOORPLAN_GALLERY_PAGE_TOOLTIP = "This option shows or hides the 'View All Floor Plans' button on the map. " \
                                   "When on, visitors can open the full floor plan gallery listing page; " \
                                   "when off, the button is hidden and visitors browse floor plans directly " \
                                   "on the map.".freeze

  def get_filters_list
    [
      { name: "Properties",   marketing: :marketing_properties_enabled,  ops: :ops_properties_enabled },
      { name: "Bedrooms",     marketing: :marketing_bedrooms_enabled,    ops: :ops_bedrooms_enabled },
      { name: "Pricing",      marketing: :marketing_pricing_enabled,     ops: :ops_pricing_enabled },
      { name: "Square Feet",  marketing: :marketing_square_feet_enabled, ops: :ops_square_feet_enabled },
      { name: "Availability", marketing: :marketing_availability_enabled,ops: :ops_availability_enabled },
      { name: "Units",        marketing: :marketing_units_tab_enabled,      ops: :ops_units_tab_enabled },
      { name: "Floor Plans",  marketing: :marketing_floorplans_tab_enabled, ops: :ops_floorplans_tab_enabled },
      { name: "Amenities",    marketing: :marketing_amenities_tab_enabled,  ops: :ops_amenities_tab_enabled },
      { name: "Favorites",    marketing: :marketing_favorites_tab_enabled,  ops: :ops_favorites_tab_enabled },
      {
        name:      "Show sort options",
        marketing: :marketing_sort_enabled,
        ops:       :ops_sort_enabled,
        tooltip:   SORT_TOOLTIP
      },
      {
        name:      "Enable Floor Plan Gallery Page",
        marketing: :marketing_floorplan_gallery_page_enabled,
        ops:       :ops_floorplan_gallery_page_enabled,
        tooltip:   FLOORPLAN_GALLERY_PAGE_TOOLTIP
      }
    ]
  end

    # --------- Marketing Map Filters Visibility --------- #

  def show_marketing_map_properties_filter
    return true unless community.turn_availability_on
    marketing_properties_enabled
  end

  def show_marketing_map_bedrooms_filter
    return true unless community.turn_availability_on
    marketing_bedrooms_enabled
  end

  def show_marketing_map_pricing_filter
    return true unless community.turn_availability_on
    marketing_pricing_enabled
  end

  def show_marketing_map_square_feet_filter
    return true unless community.turn_availability_on
    marketing_square_feet_enabled
  end

  def show_marketing_map_availability_filter
    return true unless community.turn_availability_on
    marketing_availability_enabled
  end

  def get_filter_list ops_map = false
    {
      show_properties_filter: ops_map ? show_ops_map_properties_filter() : show_marketing_map_properties_filter(),
      show_bedroom_filter: ops_map ? show_ops_map_bedrooms_filter() : show_marketing_map_bedrooms_filter(),
      show_pricing_filter: ops_map ? show_ops_map_pricing_filter() : show_marketing_map_pricing_filter(),
      show_square_feet_filter: ops_map ? show_ops_map_square_feet_filter() : show_marketing_map_square_feet_filter(),
      show_availability_filter: ops_map ? show_ops_map_availability_filter() : show_marketing_map_availability_filter(),
    }
  end

  # --------- Ops Map Filters Visibility --------- #

  def show_ops_map_properties_filter
    return true unless community.turn_availability_on
    ops_properties_enabled
  end

  def show_ops_map_bedrooms_filter
    return true unless community.turn_availability_on
    ops_bedrooms_enabled
  end

  def show_ops_map_pricing_filter
    return true unless community.turn_availability_on
    ops_pricing_enabled
  end

  def show_ops_map_square_feet_filter
    return true unless community.turn_availability_on
    ops_square_feet_enabled
  end

  def show_ops_map_availability_filter
    return true unless community.turn_availability_on
    ops_availability_enabled
  end

  def all_filters_disabled?(ops_map = false)
    get_filter_list(ops_map).values.all?(false)
  end

  # --------- Sort Visibility --------- #

  # Unlike the filter toggles above, this is NOT short-circuited by
  # `community.turn_availability_on`. The sort control is a right-rail UI
  # affordance, not an availability-derived filter, so the CMS toggle is the
  # only thing that decides it — same as the tab toggles below.
  def show_sort_options?(ops_map = false)
    ops_map ? ops_sort_enabled : marketing_sort_enabled
  end

  # --------- Floor Plan Gallery Page Visibility --------- #

  # Gates the "View All Floor Plans" button that opens the full floor-plan
  # gallery listing page. Like the sort toggle above, this is a UI affordance
  # rather than an availability-derived filter, so `community.turn_availability_on`
  # does not short-circuit it — the CMS toggle alone decides.
  def show_floorplan_gallery_page?(ops_map = false)
    ops_map ? ops_floorplan_gallery_page_enabled : marketing_floorplan_gallery_page_enabled
  end

  # --------- Tab Visibility --------- #

  def get_tab_visibility_list(ops_map = false)
    {
      show_units_tab:      ops_map ? ops_units_tab_enabled      : marketing_units_tab_enabled,
      show_floorplans_tab: ops_map ? ops_floorplans_tab_enabled : marketing_floorplans_tab_enabled,
      show_amenities_tab:  ops_map ? ops_amenities_tab_enabled  : marketing_amenities_tab_enabled,
      show_favorites_tab:  ops_map ? ops_favorites_tab_enabled  : marketing_favorites_tab_enabled
    }
  end
end
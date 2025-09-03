class MapFilter < ApplicationRecord
  belongs_to :community

  def get_filters_list
    [
      { name: "Properties", marketing: :marketing_properties_enabled, ops: :ops_properties_enabled },
      { name: "Bedrooms", marketing: :marketing_bedrooms_enabled, ops: :ops_bedrooms_enabled },
      { name: "Pricing", marketing: :marketing_pricing_enabled, ops: :ops_pricing_enabled },
      { name: "Square Feet", marketing: :marketing_square_feet_enabled, ops: :ops_square_feet_enabled },
      { name: "Availability", marketing: :marketing_availability_enabled, ops: :ops_availability_enabled }
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
end
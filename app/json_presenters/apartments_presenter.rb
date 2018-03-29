class ApartmentsPresenter < JsonPresenters
  def self.minimal_hash(community,action)
    local_assets_base_url = "http://192.168.101.77:3000"
    hash = {}
    sitemap_amenities = []
    units = []
    floorplans_for_response = []
    floorplates_for_response = []
    if community.floorplates.present?
      hash[:map_type] = "floorplates"
    else
      hash[:map_type] = "sitemap"
    end

    if community.sitemap.present? and !community.floorplates.present? 
      image_url = community.sitemap.image.url(:svg_for_metro).present? ? community.sitemap.image.url(:svg_for_metro) : community.sitemap.image.url
      hash[:sitemap] = Rails.env.development? ? local_assets_base_url+image_url : image_url
      community.sitemap.amenities.each do |amenity|
        struct = {
          image: amenity.image.present? ? (Rails.env.development? ? local_assets_base_url+amenity.image.url : amenity.image.url) : nil,
          name: amenity.name,
          x_plot: amenity.x_plot,
          y_plot: amenity.y_plot,
          sitemap_id: community.id,
          id: amenity.id
        }
        sitemap_amenities << struct
      end
      hash[:sitemap_amenities] = sitemap_amenities
    else
      hash[:sitemap] = nil
    end

    units_floorplans = []
    floorplans = community.floorplans
    community.units.each do |unit|
      if (unit.x_plot > 0 || unit.y_plot > 0) && unit.availability == "Unoccupied" && floorplans.any?{|f| f.provider_floorplan_id == unit.floorplan_id}
        floorplan = floorplans.select{|f| f.provider_floorplan_id == unit.floorplan_id}.first
        units_floorplans << floorplan
        struct = {
          marketing_name: unit.marketing_name,
          rent: unit.effective_rent,
          availability: unit.availability,
          x_plot: unit.x_plot,
          y_plot: unit.y_plot,
          building: unit.building,
          floorplan_id: floorplan.id,
          unit_type: unit.unit_type,
          provider_unit_id: unit.provider_unit_id,
          id: unit.id,
          floorplan_name: floorplan.present? ? floorplan.name : nil,
          bedrooms: floorplan.present? ? floorplan.bedrooms : 0,
          bathrooms: floorplan.present? ? convert_float_to_integer(floorplan.bathrooms) : 0,
          square_feet: floorplan.present? ? floorplan.square_feet : 0,
          image: unit.image.present? ? (Rails.env.development? ? local_assets_base_url+unit.image.url : unit.image.url) : (floorplan.present? && floorplan.image.present? ? (Rails.env.development? ? local_assets_base_url+floorplan.image.url : floorplan.image.url) : nil),
          floorplan_image: floorplan.present? ? (floorplan.image.present? ? (Rails.env.development? ? local_assets_base_url+floorplan.image.url : floorplan.image.url) : nil) : nil,
          floorplate_number: unit.floorplate.present? ? unit.floorplate.number : 0
        }
        struct[:available_date] =  unit.available_date.strftime('%m/%d/%Y') if unit.available_date.present?
        units << struct
      end  
    end
    hash[:units] = units

    units_floorplans.uniq.each do |floorplan|
      struct = {
        id: floorplan.id,
        provider_floorplan_id: floorplan.provider_floorplan_id,
        name: floorplan.name,
        rent: floorplan.market_rent,
        units_available: floorplan.units_available,
        unit_count: floorplan.unit_count,
        bedrooms: floorplan.bedrooms,
        bathrooms: floorplan.bathrooms,
        square_feet: floorplan.square_feet,
        description: floorplan.description,
        image: floorplan.image.present? ? (Rails.env.development? ? local_assets_base_url+floorplan.image.url : floorplan.image.url) : nil
      }
      
      struct[:virtual_tour] = floorplan.virtual_tour_url unless action == "ios_data"
      floorplan_amenities = []
      floorplan.amenities.each do |amenity|
        amenity_struct = {
          image: amenity.image.present? ? (Rails.env.development? ? local_assets_base_url+amenity.image.url : amenity.image.url) : nil,
          name: amenity.name,
          x_plot: amenity.x_plot,
          y_plot: amenity.y_plot,
          floorplan_id: floorplan.id,
          id: amenity.id
        }
        floorplan_amenities << amenity_struct
      end
      struct[:floorplan_amenities] = floorplan_amenities
      floorplans_for_response << struct
    end
    hash[:floorplans] = floorplans_for_response

    floorplates = community.floorplates
    floorplates = floorplates.sort_by { |f| -f.number }
    floorplates.each do |floorplate|
      struct = {
        image_url: floorplate.image.url(:svg_for_metro).present? ? floorplate.image.url(:svg_for_metro) : floorplate.image.url,
        id: floorplate.id,
        number: floorplate.number,
        name: floorplate.name,
        range: floorplate.range,
        image: floorplate.image.present? ? (Rails.env.development? ? local_assets_base_url+image_url : image_url) : nil
      }
      floorplate_amenities = []
      floorplate.amenities.each do |amenity|
        if (amenity.x_plot.present? && amenity.y_plot.present?) && (amenity.x_plot > 0 || amenity.y_plot > 0)
          amenity_struct = {
            image: amenity.image.present? ? (Rails.env.development? ? local_assets_base_url+amenity.image.url : amenity.image.url) : nil,
            name: amenity.name,
            x_plot: amenity.x_plot,
            y_plot: amenity.y_plot,
            floorplate_id: floorplate.id,
            id: amenity.id
          }
          floorplate_amenities << amenity_struct
        end
      end
      struct[:floorplate_amenities] = floorplate_amenities
      floorplates_for_response << struct
    end
    hash[:floorplates] = floorplates_for_response

    hash
  end
end

def convert_float_to_integer(x)
  if x%1 == 0
    return x.to_i
  else
    return x
  end
end
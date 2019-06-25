json.tours @tours do |tour|

  json.id tour.id
  require 'securerandom'
  json.tour_key  random_string = SecureRandom.hex
  json.community_id tour.community_id
  json.name tour.name
  json.latitude tour.latitude
  json.longitude tour.longitude
  json.x_plot tour.x_plot
  json.y_plot tour.y_plot
  json.image tour.image.present? ? tour.image.url : (@community.is_sitemap ? @community.sitemap.image.url : @community.floorplates.first.image.url)

  json.tour_stop tour.tour_stops.order(:sort) do |stop|
    json.id stop.id
    json.x_plot stop.latitude
    json.y_plot stop.longitude
    json.type stop.stop_type
    if stop.stop_type == "unit"
      unit = Unit.find stop.stop_id
      json.image unit.present? ? (unit.image.present? ? unit.image.url : (unit.floorplan.image.present? ? unit.floorplan.image.url : "no image") ): "no image"
      json.name  "Apartment "+unit.marketing_name
      stop_dat = {"floorplan" => Floorplan.find_by(provider_floorplan_id: unit.floorplan_id).name,"effective_rent" => unit.effective_rent,"available_date" => unit.available_date,"availability" => unit.availability,"stop_description" => unit.stop_description}
      json.stop_data stop_dat
      @unit_amenities = unit.amenities #Amenity.where(community_id: @community.id, amenityable_type: "Unit", amenityable_id: stop.stop_id)
      json.unit_amenities @unit_amenities.order(:sort) do |unit_amenity|
        if unit_amenity.x_plot.present? && (unit_amenity.x_plot + unit_amenity.y_plot > 0)
          json.x_plot unit_amenity.x_plot
          json.y_plot unit_amenity.y_plot
          json.name unit_amenity.name
          json.image unit_amenity.image.present? ? unit_amenity.image.url : "no image"
          json.stop_description unit_amenity.description
          if unit_amenity.amenity_galleries.count == 0
            # temp_data = {"name" => unit_amenity.name, "image" => unit_amenity.image.present? ? unit_amenity.image.url : "no image", "description" => unit_amenity.description}
            json.amenity_gallery ["name" => unit_amenity.name, "image" => unit_amenity.image.present? ? unit_amenity.image.url : "no image", "description" => unit_amenity.description]
          else
            am = AmenityGallery.new
            am.name = unit_amenity.name
            am.image =  unit_amenity.image.present? ? unit_amenity.image : "no image"
            am.description = unit_amenity.description
            amenityGalleryArr = []
            amenityGalleryArr << am
            unit_amenity.amenity_galleries.each do |amen|
              amenityGalleryArr << amen
            end
            json.amenity_gallery amenityGalleryArr do |ag|
              json.name ag.name
              json.image ag.image.url
              json.description ag.description
            end
          end

        end
      end
    elsif stop.stop_type == "amenity"
      amenity = Amenity.find stop.stop_id
      json.image amenity.image.present? ? amenity.image.url : "no image"
      json.stop_description amenity.description
      json.name amenity.name
      if amenity.amenity_galleries.count == 0
        json.amenity_gallery ["name" => amenity.name,"type" => "unit_stop", "image" => amenity.image.present? ? amenity.image.url : "no image", "description" => amenity.description]
      else
        # json.amenity_gallery ["name" => amenity.name,"type" => "unit_stop", "image" => amenity.image.present? ? amenity.image.url : "no image", "description" => amenity.description]
        am = AmenityGallery.new
        am.name = amenity.name
        am.image =  amenity.image.present? ? amenity.image : "no image"
        am.description = amenity.description
        amenityGalleryArr = []
        amenityGalleryArr << am
        amenity.amenity_galleries.each do |amen|
          amenityGalleryArr << amen
        end
        json.amenity_gallery amenityGalleryArr do |ag|
          json.name ag.name
          json.type "unit_stop"
          json.image ag.image.url
          json.description ag.description
        end
      end

    end
    stop.stop_details.each do |sd|
      json.stop_description sd.description
    end
    stop.stop_galleries.each do |sg|
      json.stop_gallery_name sg.name
      json.stop_galerry_image sg.image.present? ? sg.image.url : "no image"
    end
  end

end
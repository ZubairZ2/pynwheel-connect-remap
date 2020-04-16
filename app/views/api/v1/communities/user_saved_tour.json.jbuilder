json.name @tour_user.name
json.phone_number @tour_user.phone_number
json.email @tour_user.email
last_vs = VisitedStop.where(tour_user_id: @tour_user.id).last
@tours.each do |tour|
  if tour[0][1] == last_vs.tour_key
    @tours = { [tour[0][0],tour[0][1]] => tour[1]}
  end
end
# @tours = { [@tours.keys.last[0],@tours.keys.last[1]] => @tours.values.last}
# @tours = @tours.last

json.tours @tours do |tour|
  tour_key = tour[0][1]
  tour = Tour.find tour[0][0]
  @community = Community.find tour.community_id
  json.id tour.id
  json.community_id tour.community_id
  json.name tour.name
  json.latitude tour.latitude
  json.longitude tour.longitude
  json.x_plot tour.x_plot
  json.y_plot tour.y_plot
  json.image tour.image.present? ? tour.image.url : (@community.is_sitemap ? @community.sitemap.image.url : @community.floorplates.first.image.url)
  visited_stops = VisitedStop.where(tour_user_id: @tour_user.id, tour_id: tour.id,tour_key: tour_key).group('tour_stop_id').count

  json.visited_tour visited_stops do |visited_stop|
    @tour = TourStop.find visited_stop[0] rescue next
    if @tour.stop_type != "elevator"
      json.id @tour.id
      # @tour = TourStop.find visited_stop[0]
      json.type @tour.stop_type
      if @tour.stop_type == "unit"
        json.unit_id unit.id
        unit = Unit.find @tour.stop_id
        json.image unit.present? ? (unit.image.present? ? unit.image.url : (unit.floorplan.image.present? ? unit.floorplan.image.url : "no image") ): "no image"
        json.name "Apartment "+unit.marketing_name
        lease_pricing = []
        if unit.lease_pricing.present? && !unit.modal_unit
          str_split = unit.lease_pricing.split(';')
          str_split.each do |ss|
            str = ss.split(':')

            pricing_str = str[0]+" Month - $"+str[1]
            # h = {"pricing_option" => pricing_str}
            lease_pricing << pricing_str

          end
          lease_pricing = lease_pricing.sort_by {|x| x[0..1].to_i}
          lease_pricing2 = []
          lease_pricing.each do |lp|
            lease_pricing2 << {"pricing_option" => lp}
          end
          lease_pricing = lease_pricing2
        else
          h = {"pricing_option" => "$"+ unit.effective_rent.to_s}
          lease_pricing << h
        end
        if unit.modal_unit
          lease_pricing = []
          @units = Unit.where('floorplan_id = ? AND community_id = ? AND available = ? AND available_date > ?', unit.floorplan_id,unit.community_id,true, Date.today) if unit.present?
          @units.each do |floorplan_unit|
            unless floorplan_unit.id == unit.id
              pricing_str = {"pricing_option" => floorplan_unit.marketing_name + " $" + floorplan_unit.effective_rent.to_s} rescue next
              lease_pricing << pricing_str
            end
          end
          lease_pricing = lease_pricing.sort_by!(&:zip)
        end
        stop_dat = {"floorplan" => unit.floorplan_id,"effective_rent" => unit.effective_rent,"available_date" => unit.available_date,"lease_pricing" => lease_pricing,"availability" => unit.availability,"stop_description" => unit.stop_description, "availability_url"=> unit.availability_url.present? ? unit.availability_url :  Floorplan.find_by(provider_floorplan_id: unit.floorplan_id).availability_url}
        json.stop_data stop_dat
        @unit_gallery_arr = []
        @unit_amenities = unit.amenities # Amenity.where(community_id: (Tour.find @tour.tour_id).community_id, amenityable_type: "Unit", amenityable_id: @tour.stop_id)
        json.unit_amenities @unit_amenities do |unit_amenity|
          if unit_amenity.x_plot.present? && (unit_amenity.x_plot + unit_amenity.y_plot > 0)
          json.x_plot unit_amenity.x_plot
          json.y_plot unit_amenity.y_plot
          json.image unit_amenity.image.present? ? unit_amenity.image.url : "no image"
          json.stop_description unit_amenity.description
          json.directional_text unit_amenity.directional_text

          # unit_amenity.description = nil
          @unit_gallery_arr << unit_amenity

          unit_amenity.amenity_galleries.each do |ag|
            @unit_gallery_arr << ag
            # json.name ag.name
            # json.image ag.image.url
            # json.description ag.description
          end
          end
        end
        if @unit_gallery_arr.present?
          json.gallery @unit_gallery_arr do |ag|
            json.name ag.name
            json.image ag.image.url
            json.description ag.description
            json.directional_text ag.directional_text
          end
        else
          json.gallery do
            json.name ""
            json.image unit.present? ? (unit.image.present? ? unit.image.url : (unit.floorplan.image.present? ? unit.floorplan.image.url : "no image") ): "no image"
            json.description ""
            json.directional_text ""
          end
        end

      elsif @tour.stop_type == "amenity"
        amenity = Amenity.find @tour.stop_id
        json.image amenity.image.present? ? amenity.image.url : "no image"
        json.stop_description amenity.description
        json.name amenity.name
        json.directional_text amenity.directional_text

        # amenity.description = nil
        amenityGalleryArr = []
        amenityGalleryArr << amenity
        amenity.amenity_galleries.each do |amen|
          amenityGalleryArr << amen
        end

        json.gallery amenityGalleryArr do |ag|
          json.name ag.name
          json.type "unit_stop"
          json.image ag.image.url
          json.description ag.description
          json.directional_text ag.directional_text
        end
      end
      user_gallery = VisitedStop.where(tour_user_id: @tour_user.id, tour_id: tour.id,tour_stop_id: @tour.id,tour_key: tour_key).where.not(image: nil)
      gallery_arr = []
      user_gallery.each do |ud|
        gallery_arr << ud.image.url
        # json.image ud.image.url
      end
      json.user_gallery gallery_arr
      user_notes = VisitedStop.where(tour_user_id: @tour_user.id, tour_id: tour.id,tour_stop_id: @tour.id,tour_key: tour_key).where.not(description: nil)
      description_arr = []
      user_notes.each do |un|
        description_arr << un.description
        # json.description un.description
      end
      json.notes description_arr
    end
  end

end


json.name @tour_user.name
json.phone_number @tour_user.phone_number
json.email @tour_user.email
json.visual_id_verification @community.present? ? @community.tour.visual_id_verification : true
@community.present? ? last_vs = VisitedStop.where(tour_user_id: @tour_user.id,tour_id: @community.tour.id).last : last_vs = VisitedStop.where(tour_user_id: @tour_user.id).last
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
    stop = VisitedStop.where(tour_user_id: @tour_user.id, tour_id: tour.id,tour_key: tour_key,tour_stop_id: visited_stop[0],description: nil, image: nil)
    if @tour.stop_type != "elevator"
      json.id @tour.id
      # @tour = TourStop.find visited_stop[0]
      json.type @tour.stop_type
      if @tour.stop_type == "unit"
        unit = Unit.find @tour.stop_id
        json.image unit.present? ? (unit.image.present? ? unit.image.url : (unit.floorplan.image.present? ? unit.floorplan.image.url : "no image") ): "no image"
        json.name "Apartment "+unit.marketing_name
        json.event_time (stop.event_date.present? ? stop.event_date.strftime("%m/%d/%Y") + " " : "") + (stop.event_time.present? ? stop.event_time.strftime("%H:%M:%S") : "")
        json.video_link_button_label unit.virtual_tour_button_label
        json.video_link unit.virtual_tour_url.present? ? unit.virtual_tour_url : ""
        lease_pricing = []
        if unit.lease_pricing.present?
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
          json.video_link_button_label unit.virtual_tour_button_label
          json.video_link unit.virtual_tour_url.present? ? unit.virtual_tour_url : ""

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
        json.gallery @unit_gallery_arr do |ag|
          json.name ag.name
          json.image ag.image.url
          json.description ag.description
          json.directional_text ag.directional_text
        end
      elsif @tour.stop_type == "amenity"
        amenity = Amenity.find @tour.stop_id
        json.image amenity.image.present? ? amenity.image.url : "no image"
        json.stop_description amenity.description
        json.name amenity.name
        json.event_time (stop.event_date.present? ? stop.event_date.strftime("%m/%d/%Y") + " " : "") + (stop.event_time.present? ? stop.event_time.strftime("%H:%M:%S") : "")
        json.directional_text amenity.directional_text
        json.video_link_button_label amenity.video_link_button_label
        json.video_link amenity.video_link.present? ? amenity.video_link : ""

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
      gallery_arr_v1 = []
      user_gallery.each do |ud|
        obj = {}
        obj[:id] = ud.id
        obj[:image] = ud.image
        obj[:event_time] = (ud.event_date.present? ? ud.event_date.strftime("%m/%d/%Y") + " " : "") + (ud.event_time.present? ? ud.event_time.strftime("%H:%M:%S") : "")
        gallery_arr << ud.image
        gallery_arr_v1 << obj
        # json.image ud.image.url
      end
      json.user_gallery gallery_arr
      json.user_gallery_v1 gallery_arr_v1
      user_notes = VisitedStop.where(tour_user_id: @tour_user.id, tour_id: tour.id,tour_stop_id: @tour.id,tour_key: tour_key).where.not(description: nil)
      description_arr = []
      description_arr_v1 = []
      user_notes.each do |un|
        obj = {}
        obj[:id] = un.id
        obj[:note] = un.description
        obj[:event_time] = (un.event_date.present? ? un.event_date.strftime("%m/%d/%Y") + " " : "") + (un.event_time.present? ? un.event_time.strftime("%H:%M:%S") : "")
        description_arr << un.description
        description_arr_v1 << obj
        # json.description un.description
      end
      json.notes description_arr
      json.notes_v1 description_arr_v1
    end
  end

end


namespace :tour_stops do
  desc 'Add tour stops floors and building for floorplate communities'
  task :add_floors_buildings => :environment do
    
    Community.where(is_sitemap: false).each do |community|

      unless community.is_sitemap
        tour = community.community_tour
        sort_hash = tour.sort_hash

        building_list = community.units.pluck(:building).distinct + community.amenities.pluck(:building).distinct
        building_list = building_list.compact.distinct.sort!

        floors_list = Floors.new(community).get_community_floors

        clean_building_array = building_list.reject(&:blank?)

        if community.community_tour.building_order.present?
          clean_building_array =  community.community_tour.building_order.reject(&:blank?)
        end

        puts "Community: #{community.id}, #{community.name}"
        puts "sort_hash:  #{sort_hash}"
        puts "building_list:  #{building_list}"
        puts "floors_list:  #{floors_list}"

        building_list << "" if building_list == []
        building_list&.each do |building|
          floors_list&.each do |floor|
            if ["", nil].include?(building)
              if sort_hash.present? && !(sort_hash == "{}")
                stops_arr = sort_hash["#{building},#{floor}"]
                building_for_assign = (clean_building_array.count > 0) ? clean_building_array[0] : "A"

                stops_arr&.each do |stop|
                  tour_stop =  TourStop.find_by_id stop

                  if tour_stop.present? && tour_stop.stop_type.present? && tour_stop.stop_id.present?
                    actual_stop = tour_stop.stop_type.classify.constantize.find_by_id tour_stop.stop_id
                    actual_stop.building = building_for_assign
                    actual_stop.save(:validate => false)
                  end
                end

                tour.sort_hash["#{building_for_assign},#{floor}"] = stops_arr.present? ? stops_arr : []
                tour.save!(:validate => false)
              end

            end


          end
        end

        puts "sort_hash:  #{community.community_tour.sort_hash} \n\n\n\n"

      end  

    end
  
  end
end
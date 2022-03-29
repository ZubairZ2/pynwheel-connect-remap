namespace :tour_stops do
  desc 'Add tour stops floors and building for floorplate communities'
  task :add_floors_buildings => :environment do
    
    Community.where(is_sitemap: false).each do |community|

      unless community.is_sitemap
        tour = community.community_tour
        sort_hash = tour.sort_hash

        building_list = Buildings.new(community).get_community_buildings
        floors_list = Floors.new(community).get_community_floors
        clean_building_array = building_list.reject(&:blank?)
        clean_floors_array = floors_list.reject(&:blank?)

        puts "Community: #{community.id}, #{community.name}"
        puts "sort_hash:  #{sort_hash}"
        puts "building_list:  #{building_list}"
        puts "floors_list:  #{floors_list}"

        building_list << "" if building_list == []
        building_list&.each do |building|
          floors_list&.each do |floor|
            if ["", nil].include?(building) || ["", nil].include?(floor)
              if sort_hash.present? && !(sort_hash == "{}")
                stops_arr = sort_hash["#{building},#{floor}"]

                if ["", nil].include?(building)
                  building_for_assign = (clean_building_array.count > 0) ? clean_building_array[0] : "A"
                else
                  building_for_assign = building
                end
  
                if ["", nil].include?(floor)
                  floor_for_assign = (clean_floors_array.count > 0) ? clean_floors_array[0] : 1
                else
                  floor_for_assign = floor
                end

                stops_arr&.each do |stop|
                  tour_stop =  TourStop.find_by_id stop

                  if tour_stop.present? && tour_stop.stop_type.present? && tour_stop.stop_id.present?
                    actual_stop = tour_stop.stop_type.classify.constantize.find_by_id tour_stop.stop_id
                    actual_stop.building = building_for_assign
                  
                    unless tour_stop.stop_type === "elevator"
                      actual_stop.floor = floor_for_assign 
                    end

                    actual_stop.save(:validate => false)
                  end
                end

                tour.sort_hash["#{building_for_assign},#{floor_for_assign}"] = stops_arr.present? ? stops_arr : []
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
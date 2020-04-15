class AutomateUnitStop < ApplicationJob
  #queue_as :default
  include SuckerPunch::Job

  def perform(community)
    community.floorplans.each do |f|
      units = Unit.where(floorplan_id: f.provider_floorplan_id,community_id: community.id,available: true)
      min_date = nil
      soonest_unit = nil
      units.each do |u|




        begin
          next if u.modal_unit
          if u.available_date.present?
            unless u.available_date < Date.today
              if min_date.present?
                if (u.available_date - Date.today) <= min_date
                  min_date = u.available_date - Date.today
                  soonest_unit = u
                end
              else
                min_date = u.available_date - Date.today

                soonest_unit = u
              end



              stop = TourStop.find_by(tour_id: community.tour.id, stop_id: u.id,stop_type: "unit")
              unless stop.present?
                if u.available
                  TourStop.create(name: u.marketing_name,tour_id: community.tour.id, latitude:u.x_plot, longitude: u.y_plot, stop_id: u.id, stop_type: "unit",display_stop: false) if (u.x_plot + u.y_plot > 1)
                else

                  stop.destroy unless u.available
                end
              else

              end




            else
              stop = TourStop.find_by(tour_id: community.tour.id, stop_id: u.id,stop_type: "unit")
              if stop.present?
                stop.display_stop = false
                stop.save
                stop.destroy if (!u.available || (u.available_date < Date.today ))
              end
            end


          else
            stop = TourStop.find_by(tour_id: community.tour.id, stop_id: u.id,stop_type: "unit")
            if stop.present?
              stop.display_stop = false
              stop.save
              stop.destroy if (!u.available || (u.available_date < Date.today ))
            end
          end
        rescue => ex
        end




      end
      stop = TourStop.find_by(tour_id: community.tour.id, stop_id: soonest_unit.id,stop_type: "unit") rescue nil
      if stop.present?
        stop.display_stop = true
        stop.save
      end
    end
  end
end

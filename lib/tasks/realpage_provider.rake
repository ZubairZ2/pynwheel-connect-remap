namespace :realpage_provider do

  desc 'Update re alpageprovider unit & floorplan id'
  task :update_realpage_provider_unit_and_floorplan_id => :environment do
    communities = Community.includes(:credential, :units, :floorplans).where(data_provider: "realpagesvc")

    communities&.each do |community|
      begin
        puts "\n\n\n----------------- #{community.name}: #{community.id}  started updating provider id"
        if community&.credential.present? &&  community&.credential&.site_id.present?
          site_ids = community&.credential&.site_id&.split(",").compact.distinct.map(&:strip)
          if site_ids.count === 1
            site_ids&.each do |site_id|
              units = community.units.where("provider_unit_id NOT LIKE ?", "%-%")
              floorplans = community.floorplans.where("provider_floorplan_id NOT LIKE ?", "%-%")

              units&.each do  |unit|
                site_id_for_unit = unit.property_id.present? ? unit.property_id : site_id

                if unit&.provider_unit_id.present?
                  unless unit&.provider_unit_id&.include?(site_id_for_unit)
                    provider_unit_id = "#{unit.provider_unit_id}-" + (unit.property_id.present? ? unit.property_id : site_id)
                    floorplan_id = "#{unit.floorplan_id }-" + (unit.property_id.present? ? unit.property_id : site_id)
                    community&.floorplans.where(provider_floorplan_id: unit.floorplan_id).update_all(provider_floorplan_id: floorplan_id)
                    unit.update_columns(provider_unit_id: provider_unit_id, floorplan_id: floorplan_id)
                  end
                end
              end

              floorplans&.each do |floorplan|
                if floorplan.provider_floorplan_id.present?
                  unless floorplan&.provider_floorplan_id&.include?(site_id)
                    floorplan.update_column(provider_floorplan_id: "#{floorplan.provider_floorplan_id}-#{site_id}")
                  end
                end
              end

            end

          end
        end
        puts "----------------- #{community.name}: #{community.id}  ended updating provider id"
      
      rescue => ex
        puts "\n\n------------Error:  #{ ex.inspect }------------\n\n"
        next
      end

    end
  end
end
namespace :yardi_voyager do

  desc 'Update yardi voyager provider unit id'

  task :update_yardi_voyager_provider_unit_id => :environment do
    Community.where(data_provider: "yardi").each do |community|
      
      begin

        if community.units.present?
          community.units.where(x_plot: 0).destroy_all
          community.units.each do |unit|
            property_id = unit.property_id
            marketing_name =  unit.marketing_name
            provider_unit_id = property_id.present? ? "#{marketing_name}-#{property_id}" : marketing_name
            unit.update(provider_unit_id: provider_unit_id)
          end
        end

      rescue
        next
      end

    end
  end
end
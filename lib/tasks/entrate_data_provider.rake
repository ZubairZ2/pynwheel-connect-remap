
namespace :entrata_data_provider do

  desc 'Remove duplicate units'
  task :remove_duplicates => :environment do
    Community.where("name ILIKE ? ", "Sterling %").each do |community|
      units = community.units

      units.each do |unit|
        provider_unit_ids = unit.provider_unit_id.split("-")

        if provider_unit_ids.present? && provider_unit_ids.count > 1 && provider_unit_ids[0] == provider_unit_ids[1]
          puts "x: #{unit.x_plot},   y: #{unit.y_plot}"
          unit.destroy!
        end
      end

    end
  end
end
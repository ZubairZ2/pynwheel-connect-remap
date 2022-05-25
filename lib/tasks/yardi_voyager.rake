namespace :yardi_voyager do

  desc 'Update yardi voyager provider unit id'

  task :update_yardi_voyager_provider_unit_id => :environment do
    puts "--------------------- Yardi provider unit id updation start ------------------------"
    Community.where(data_provider: "yardi").each do |community|
      community.units.each do |unit|
        
        puts "--------------------------------------- Community #{community.id} data updation started: -------------------------------------------------------------------"
        
        property_id = unit.property_id
        provider_unit_id =  unit.marketing_name
        
        puts "provider_unit_id - #{provider_unit_id}-#{property_id}"

        unit.update(provider_unit_id: "#{provider_unit_id}-#{property_id}")


        puts "--------------------------------------- Community #{community.id} data updation ended ------------------------------------------------------------------------"
      end
    end

    puts "--------------------- Yardi provider unit id updation end ------------------------"
  end
end
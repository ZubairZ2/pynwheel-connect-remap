namespace :import_unit_data_for_psi do
  desc 'rake task for importing communities units and floorplans for realpage only'
  task :communities_of_psi => :environment do

    Community.where(data_provider: "psi").each do |community|
      
      begin
      
        next if (community.locked.present? && community.locked)

        if community.credentials_are_present? && community.check_credentials
          ImportPsiDataJob.perform_async community.credential.attributes.to_json
        else
          next
        end
      
      rescue
        next
      end

    end
    
  end
end
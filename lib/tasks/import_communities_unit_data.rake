namespace :import do
  desc 'rake task for importing communities units and floorplans'
  task :communities_unit_data => :environment do
    Community.find_each do |community|
      puts '****************************' , community.id
      #community.data_is_imported
      case community.data_provider
        when "psi"
          PsiService.new(community.credential.attributes).perform
        when "yardirentcafe"
          YardiRentCafeService.new(community.credential.attributes).perform
        when "realpagesvc"
          RealPageSvcService.new(community.credential.attributes).perform
        when "yardi"
          community.credential.url.include?("20") ? (Yardi2Service.new(community.credential.attributes).perform) : (Yardi4Service.new(community.credential.attributes).perform)
      end
    end
  end
end
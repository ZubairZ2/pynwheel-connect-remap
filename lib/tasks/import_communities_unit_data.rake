namespace :import do
  desc 'rake task for importing communities units and floorplans'
  task :communities_unit_data => :environment do
   Community.first(2).each do |community|
      puts '****************************' , community.id
      case community.data_provider
        when "psi"
          #PsiService.new(community.credential.attributes).perform
          ImportPsiDataJob.perform_async community.credential.attributes.to_json
        when "yardirentcafe"
          #YardiRentCafeService.new(community.credential.attributes).perform
          ImportYardirentcafeDataJob.perform_async community.credential.attributes.to_json
        when "realpagesvc"
          #RealPageSvcService.new(community.credential.attributes).perform
          ImportRealpageSvcDataJob.perform_async community.credential.attributes.to_json
        when "yardi"
          #community.credential.url.include?("20") ? (Yardi2Service.new(community.credential.attributes).perform) : (Yardi4Service.new(community.credential.attributes).perform)
          community.credential.url.include?("20") ? ImportYardi2DataJob.perform_async(community.credential.attributes.to_json) : ImportYardi4DataJob.perform_async(community.credential.attributes.to_json)
      end    
    end
  end
end
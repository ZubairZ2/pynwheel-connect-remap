namespace :import do
  desc 'rake task for importing communities units and floorplans'
  task :communities_unit_data => :environment do
    community_count = Community.count 
    number_of_pages = community_count/5
    unless community_count%5 == 0
      number_of_pages = number_of_pages + 1 
    end
    (1..number_of_pages).each do |page|
      Community.page(page).per(5).each do |community|
        puts '****************************' , community.id
        case community.data_provider
          when "psi"
            #PsiService.new(community.credential.attributes).perform
            ImportPsiDataJob.perform_async community.credential.attributes.to_json
          when "yardirentcafe"
            #YardiRentCafeService.new(community.credential.attributes).perform
            ImportYardirentcafeDataJob.perform_async community.credential.attributes.to_json
          # when "realpagesvc"
          #   #RealPageSvcService.new(community.credential.attributes).perform
          #   ImportRealpageSvcDataJob.perform_async community.credential.attributes.to_json
          when "yardi"
            #community.credential.url.include?("20") ? (Yardi2Service.new(community.credential.attributes).perform) : (Yardi4Service.new(community.credential.attributes).perform)
            community.credential.url.include?("20") ? ImportYardi2DataJob.perform_async(community.credential.attributes.to_json) : ImportYardi4DataJob.perform_async(community.credential.attributes.to_json)
          when "resman"
            ImportResmanDataJob.perform_async community.credential.attributes.to_json
          when "zaremba"
            ImportZarembaDataJob.perform_async community.credential.attributes.to_json
          when "xml"
            ImportXmlDataJob.perform_async community.credential.attributes.to_json
        end    
      end
      puts 'Now waiting for 2 min for 3 background jobs to complete.'
      sleep 15
    end
  end
end
namespace :import_unit_data do
  desc 'rake task for importing communities units and floorplans for realpage only'
  task :communities_of_realpage => :environment do
    communities = Community.where(data_provider: "realpagesvc")
    communities.each do |community|
      puts '****************************' , community.id
      #RealPageSvcService.new(community.credential.attributes).perform
      ImportRealpageSvcDataJob.perform_async community.credential.attributes.to_json
      sleep 20
    end
  end
end
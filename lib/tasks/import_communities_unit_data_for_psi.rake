namespace :import_unit_data_for_psi do
  desc 'rake task for importing communities units and floorplans for realpage only'
  task :communities_of_psi => :environment do
    communities = Community.where(data_provider: "psi")
    entrata_list_logs_str  = ""
    communities.each do |community|
      puts '****************************' , community.id
      entrata_list_logs_str = entrata_list_logs_str + community.id.to_s + " , "
      #RealPageSvcService.new(community.credential.attributes).perform
      ImportPsiDataJob.perform_async community.credential.attributes.to_json
      sleep 45
    end
    current_user = User.find 10
    entrata_list_logs = {Time.now => entrata_list_logs_str}
    current_user.entrata_list_logs = current_user.entrata_list_logs + entrata_list_logs.to_s
    current_user.save
  end
end
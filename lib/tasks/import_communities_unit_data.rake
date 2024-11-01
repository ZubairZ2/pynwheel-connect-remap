namespace :import do
  desc 'rake task for importing communities units and floorplans'
  task :communities_unit_data => :environment do

    community_count = Community.count 
    number_of_pages = community_count/5
    unless community_count%5 == 0
      number_of_pages = number_of_pages + 1 
    end

    community_logs = Hash.new
    entrata_list_logs = Hash.new
    entrata_function_logs = Hash.new
    community_logs_str = ""
    entrata_list_logs_str  = ""

    (1..number_of_pages).each do |page|
      Community.page(page).per(5).each do |community|
        next if (community.locked.present? && community.locked)
        begin
          comun = Community.find community.id
          comun.neighborhood_request_counter = 0
          comun.limit_200_hit = false
          comun.limit_400_hit = false
          comun.save(validate:false)
        rescue => ex

        end
        community_logs_str = community_logs_str + community.id.to_s + " , "
        case community.data_provider
          when "yardirentcafe"
            ImportYardirentcafeDataJob.perform_async community.credential.attributes.to_json
          when "yardi"
            #community.credential.url.include?("20") ? (Yardi2Service.new(community.credential.attributes).perform) : (Yardi4Service.new(community.credential.attributes).perform)
            community.credential.url.include?("20") ? ImportYardi2DataJob.perform_async(community.credential.attributes.to_json) : ImportYardi4DataJob.perform_async(community.credential.attributes.to_json)
          when "resman"
            ((community.credential.resman_api_version === "GetMarketing4_0") ? ImportResman4DataJob.perform_async(community.credential.attributes.to_json) : ImportResmanDataJob.perform_async(community.credential.attributes.to_json))
          when "zaremba"
            ImportZarembaDataJob.perform_async community.credential.attributes.to_json
          when "xml"
            ImportXmlDataJob.perform_async community.credential.attributes.to_json
        end    
      end

      sleep 25
    end
    community_logs = {Time.now => community_logs_str}

    # entrata_list_logs = {Time.now => entrata_list_logs_str}
    current_user = User.find 10
    unless current_user.community_logs.present?
      current_user.community_logs = ""
    end
    unless current_user.entrata_list_logs.present?
      current_user.entrata_list_logs = ""
    end
    current_user.community_logs = current_user.community_logs + community_logs.to_s
    # current_user.entrata_list_logs = current_user.entrata_list_logs + entrata_list_logs.to_s
    current_user.save
    #PaperTrail::Version.where(whodunnit: nil).destroy_all
  end
end
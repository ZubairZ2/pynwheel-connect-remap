namespace :import do
	desc 'rake task for importing communities units and floorplans'
	task :communities_unit_data => :environment do
		Community.all.each do |community|
			puts '****************************' , community.id
			#community.data_is_imported
			case community.data_provider
		      when "psi"
		        psi_service = PsiService.new(community.credential.attributes)
                psi_service.perform 
		      when "yardirentcafe"
		        yardi_rent_cafe_service = YardiRentCafeService.new(community.credential.attributes)
                yardi_rent_cafe_service.perform
		      when "realpagesvc"
		        real_page_svc_service = RealPageSvcService.new(community.credential.attributes)
                real_page_svc_service.perform
		      when "yardi"
		        community.credential.url.include?("20") ? (Yardi2Service.new(community.credential.attributes).perform) : (Yardi4Service.new(community.credential.attributes).perform)
		    end
		end
	end
end
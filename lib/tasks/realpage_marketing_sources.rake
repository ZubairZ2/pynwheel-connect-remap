namespace :realpage_marketing_sources do
    desc 'rake task for importing marketing sources of realpage communities'
    task :sources_by_property => :environment do
      communities = Community.where(data_provider: "realpagesvc")
      communities.each do |community|
        community.real_page_get_marketing_sources
      end
    end
end

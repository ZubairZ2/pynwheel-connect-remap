namespace :gci do
    desc 'create communities for demo of dataprocessing module'
    task :aaa => :environment do
        community = Community.find 457
        community.real_page_get_activity_types
    end
  end
namespace :gci do
    desc 'create communities for demo of dataprocessing module'
    task :lease => :environment do
            community = Community.find 457
            tour_user = TourUser.find 190
            community.realpage_get_leasing_agents
            # community.realpage_insert_prospect(tour_user)
    end
  end
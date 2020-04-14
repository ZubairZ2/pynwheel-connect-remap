namespace :automate do
  desc 'create communities for demo of dataprocessing module'
  task :unit_stops => :environment do
    Community.where(self_tour: true).each do |community|
      AutomateUnitStop.perform_async community
    end
  end
end
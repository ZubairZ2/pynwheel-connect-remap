namespace :automate do
  desc 'create communities for demo of dataprocessing module'
  task :unit_stops => :environment do
    Community.where(self_tour: true,automate_unit_stop: true).each do |community|
      # auto = AutomateUnitStop.new
      # auto.perform community
      AutomateUnitStop.perform_async community
      sleep 2
    end
  end
end
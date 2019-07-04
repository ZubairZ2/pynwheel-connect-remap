namespace :reset_counter do
  desc 'rake task for importing communities units and floorplans for realpage only'
  task :reset => :environment do
    rep = HTTParty.get('http://192.168.101.87:3000/api/v1/communities/1/reset_counter')
  end
end
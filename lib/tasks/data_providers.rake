
namespace :data_providers do
  desc 'Update data providers'
  task :updation  => :environment do
    DataProvidersService.new().update_providers_data()
  end
end
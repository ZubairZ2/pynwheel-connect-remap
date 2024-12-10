
namespace :crm_providers do
  desc 'Update crm providers data'
  task :updation  => :environment do
    CrmProvidersService.new().update_crm_providers_data()
  end
end
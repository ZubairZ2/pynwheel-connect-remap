
namespace :providers_data_updation do
  desc 'Update entrata data'
  task :entrata => :environment do
    DataProvidersService.new("psi").sync_psi_data() #61
  end

  desc 'Update resman data'
  task :resman => :environment do
    DataProvidersService.new("resman").sync_resman_data() #10
  end

  desc 'Update yardi data'
  task :yardi => :environment do
    DataProvidersService.new("yardi").sync_yardi_data() #38 
  end

  desc 'Update yardi rent cafe data'
  task :yardi_rent_cafe => :environment do
    DataProvidersService.new("yardirentcafe").sync_yardirentcafe_data() #123
  end

  desc 'Update real_page data'
  task :real_page => :environment do
    DataProvidersService.new("realpagesvc").sync_realpagesvc_data() #39
  end

  desc 'Update spread sheet data'
  task :spread_sheet => :environment do
    DataProvidersService.new("spreadsheet").sync_spreadsheet_data() #11
  end

  desc 'Update zaremba data'
  task :zaremba => :environment do
    DataProvidersService.new("zaremba").sync_zaremba_data() #0
  end

  desc 'Update xml data'
  task :xml => :environment do
    DataProvidersService.new("xml").sync_xml_data() #2
  end

end
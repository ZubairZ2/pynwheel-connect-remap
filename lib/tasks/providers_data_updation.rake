
namespace :providers_data_updation do

  desc 'Update entrata data'
  task :entrata => :environment do
    communities = Community.where.not(data_provider: nil, company_id: 44)
    communities = communities.where(data_provider: "psi", locked: false) #61
  end

  desc 'Update resman data'
  task :resman => :environment do
    communities = Community.where.not(data_provider: nil, company_id: 44)
    communities = communities.where(data_provider: "resman", locked: false) #10
  end

  desc 'Update yardi data'
  task :yardi => :environment do
    communities = Community.where.not(data_provider: nil, company_id: 44)
    communities = communities.where(data_provider: "yardi", locked: false) #38 
  end

  desc 'Update yardi rent cafe data'
  task :yardi_rent_cafe => :environment do
    communities = Community.where.not(data_provider: nil, company_id: 44)
    communities = communities.where(data_provider: "yardirentcafe", locked: false) #123
  end

  desc 'Update real_page data'
  task :real_page => :environment do
    communities = Community.where.not(data_provider: nil, company_id: 44)
    communities = communities.where(data_provider: "realpagesvc", locked: false) #39
  end

  desc 'Update spread sheet data'
  task :spread_sheet => :environment do
    communities = Community.where.not(data_provider: nil, company_id: 44)
    communities = communities.where(data_provider: "spreadsheet", locked: false) #11
  end

  desc 'Update zaremba data'
  task :zaremba => :environment do
    communities = Community.where.not(data_provider: nil, company_id: 44)
    communities = communities.where(data_provider: "zaremba", locked: false) #0
  end

  desc 'Update xml data'
  task :xml => :environment do
    communities = Community.where.not(data_provider: nil, company_id: 44)
    communities = communities.where(data_provider: "xml", locked: false) #2
  end

end
namespace :db do
  desc 'create communities for demo of dataprocessing module'
  task :create_communities => :environment do
    Company.where(name: "pynwheel").first_or_create
    Community.where(name: "ellis", data_provider: "psi", company_id: 1).first_or_create # PSI
    Community.where(name: "rent cafe", data_provider: "yardirentcafe", company_id: 1).first_or_create # YardiRentCafe
    Community.where(name: "integra creek", data_provider: "realpagesvc", company_id: 1).first_or_create # RealPageSvc
    Community.where(name: "century", data_provider: "yardi2", company_id: 1).first_or_create # Yardi2
    Community.where(name: "loreto", data_provider: "yardi4", company_id: 1).first_or_create # Yardi4
    Community.where(name: "swoop", data_provider: "swoop", company_id: 1).first_or_create # Swoop
    puts " ************ communities created ************ "
  end
end
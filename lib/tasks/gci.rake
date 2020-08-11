namespace :gci do
    desc 'create guest card integration'
    task :create_gci => :environment do
        puts '-----------------------------'
        community = Community.find 457
        CreateRealpageGciJob.perform_async community.credential.attributes.to_json
    end
  end
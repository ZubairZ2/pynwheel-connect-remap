namespace :heroku do
  desc "Restart heroku web dyno to avoid memory leak"
  task :restart => :environment do
    RestartAppWorker.perform_async()
  end
end
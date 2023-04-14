namespace :destroy_old_impressions do
  task :destroy_impressions => :environment do
    Impression.where("created_at < ? ", Date.today.prev_month).destroy_all
  end
end 
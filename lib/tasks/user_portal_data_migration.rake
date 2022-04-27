namespace :user_portal_data_migration do

  desc 'Update statuses for existing communities'
  task :update_communities_statuses => :environment do
    
    current_user = User.where(role: "Super admin", first_name: "Jennifer").last
    status = "completed"

    Community.all.each do |community|
      Statuses.new(community, current_user, status).update_statuses
    end

  end
end
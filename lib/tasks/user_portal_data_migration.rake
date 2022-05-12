namespace :user_portal_data_migration do

  desc 'Update statuses for existing communities'
  task :update_communities_statuses => :environment do
    
    current_user = User.where(role: "Super admin", first_name: "Jennifer").last
    status = "deployed"

    Community.all.each do |community|
      Statuses.new(community, current_user, status).update_statuses
    end

  end

  desc 'Add random community user for existing missing communities'
  task :add_community_user => :environment do
    communities = Community.includes(:community_users).where(community_users: {id: nil})
    communities.each do |community|
      if community.company.users.present?
        CommunityUser.create(community_id: community.id, user_id: community.company.users.first.id)
      elsif community.company.creator.present?
        CommunityUser.create(community_id: community.id, user_id: community.company.creator.id)
      else
        CommunityUser.create(community_id: community.id, user_id: 15)
      end
    end
  end
end
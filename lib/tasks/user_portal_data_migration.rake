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

  desc 'change the existing stand vendors under the pynwheel touch product options'
  task :change_stand_vendor => :environment do
    communities = Community.where.not(product_options: nil)
    communities.each do |community|
      parsed_product = JSON.parse(community["product_options"])
      stand = parsed_product["product_options"]["pynwheel_touch"]["options"]["stand"]
      if stand.eql?("Olea")
        parsed_product["product_options"]["pynwheel_touch"]["options"]["stand"] = "Kiosk"
      elsif stand.eql?("Chief")
        parsed_product["product_options"]["pynwheel_touch"]["options"]["stand"] = "Upright"
      else
        next
      end
      stringified_product = JSON.generate(parsed_product)
      community.update(product_options: stringified_product)
    end
  end

  desc 'activate pynwheel_launch for all communities'
  task :change_pynwheel_launch_access => :environment do
    Community.update_all(:pynwheel_launch_access => :true)
  end
end
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

  desc 'Change current statuses of all community forms with new status flow'
  task :change_current_status => :environment do
    approved = Status.where(status: "approved")
    approved.update_all(status: "form_approved")
    deployed = Status.where(status: "deployed")
    deployed.update_all(status: "released")
  end

  desc 'Change all form_approved statuses to approved'
  task :change_status => :environment do
    approved = Status.where(status: "form_approved")
    approved.update_all(status: "approved")
    released = Status.where(status: "deployed")
    released.update_all(status: "released")
    in_review = Status.where(status: "application_in_qa")
    in_review.update_all(status: "in_review")
  end
  
  desc 'Change amenity names for existing communities'
  task :change_current_status => :environment do
    yoga = Amenity.where(amenity_type: ["Yoga Studio"])
    yoga.update_all(amenity_type: "Yoga Studio / Fitness Studio")
    business = Amenity.where(amenity_type: ["Business Center", "Business Lounge"])
    business.update_all(amenity_type: "Business Center / Lounge")
  end

  desc 'change default value to true for pynwheel access settings'
  task :change_product_options_for_pynwheel_access => :environment do
    communities = Community.where(pynwheel_launch_access: true).where.not(product_options: [nil, ""])
    communities.each do |community|
      product_options = JSON.parse(community.product_options)
      product_options["product_options"]["pynwheel_access"] = community.pynwheel_access
      product_options_string = JSON.generate(product_options)
      community.update(product_options: product_options_string)
    end
  end

  desc 'change default existing other locks to unit'
  task :change_existing_other_locks_to_unit => :environment do
    other_locks = OtherLock.where(area_type: [nil, ""])
    other_locks.each do |lock|
      lock.area_type = "unit"
      lock.save!
    end
  end

  desc 'Adjust the crm_credential status according to crdential'
  task :crm_credentials_status_issue => :environment do
    communities = Community.where(pynwheel_launch_access: true)
    communities.each do |community|
      if community&.credential.present?
        credential_status = community&.credential&.status&.status
        crm_credential = community.crm_credential
        if crm_credential.present?
          crm_credential.create_status(status: credential_status) if crm_credential.status.nil?
          crm_credential.status.update(status: credential_status) unless crm_credential.status.nil?
        end
      end
    end
  end
end
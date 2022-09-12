namespace :follow_up_emails do

  desc "send email to those communities which are not in production"
  task :non_production_communities_email => :environment do
    @communities = Community.where(pynwheel_launch_access: true)
    @communities.each do |community|
      unless community.company.name.include?("Dwelo")
        if community.follow_up_email_date.nil? || community.follow_up_email_date.eql?(community.follow_up_email_date + 14)
          forms = PynwheelLaunch::Communities::FollowUpEmails.new(community).non_production_communities_email
          if !forms.empty?
            FollowUpMailer.non_production_communities_email(community, forms)
            community.update_attributes(follow_up_email_date: Date.today)
          end
        end
      end
    end
  end

end
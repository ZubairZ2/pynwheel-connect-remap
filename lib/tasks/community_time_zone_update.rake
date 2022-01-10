namespace :community_time_zone do
  desc 'update communities time zone'
  task :update_time_zone => :environment do
    communities = Community.all

    communities.each do |community|
      begin
        if community.time_zone.eql?("UTC") || !community.time_zone.present?
          if community.latitude.present? && community.longitude.present?

            time_zone = Timezone.lookup(community.latitude, community.longitude)&.name

            if time_zone.present?
              community.update_column :time_zone, time_zone
            end

          end
        end
        
      rescue
        next
      end

    end
  end
end
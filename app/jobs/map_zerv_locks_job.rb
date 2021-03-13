class MapZervLocksJob < ApplicationJob
    include SuckerPunch::Job
  
    def perform(community)
        community.zerv.zerv_locks.each do |zerv_lock|
            data = parse_stop(zerv_lock.sub_location_name,community)
            if data.present?
                data.zerv_locks.map{|z| z.update_attributes(stop_type: nil, stop_id: nil)}
                zerv_lock.update_columns(stop_type: data.class.to_s.classify, stop_id: data.id)
                data.update_column(:lock_provider, "Zerv")
            end
        end
    end

end
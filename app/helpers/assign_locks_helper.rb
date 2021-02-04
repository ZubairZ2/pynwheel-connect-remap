module AssignLocksHelper
    def assign_lock(community, stop, lock_id)

        if community.locks_provider == "Latch"

            if lock_id.present?
                latch_lock = LatchLock.find_by(door_uuid: lock_id, latch_id: community.latch.id) rescue nil
                if latch_lock.present? and stop.latch_locks.present? and stop.latch_locks.last.door_uuid != latch_lock.door_uuid
                    stop.latch_locks.update_all(stop_id: nil, stop_type: nil)
                    latch_lock.update_attributes(stop_id: stop.id, stop_type: stop.class.name) rescue nil
                elsif latch_lock.present? and stop.latch_locks.blank?
                    latch_lock.update_attributes(stop_id: stop.id, stop_type: stop.class.name) rescue nil
                end
            elsif lock_id == ""
                stop.latch_locks.update_all(stop_id: nil, stop_type: nil)
            end

        elsif community.locks_provider == "EdgeState" or community.locks_provider == "Dwelo"

            if lock_id.present?
                remote_lock = community.locks_provider.constantize.find_by(community_id: community.id).remote_locks.find_by(device_id: lock_id) rescue nil
                if remote_lock.present? and stop.remote_locks.present? and stop.remote_locks.last.device_id != remote_lock.device_id
                  stop.remote_locks.update_all(stop_id: nil, stop_type: nil, stop_name: nil)
                  remote_lock.update_attributes(stop_id: stop.id, stop_type: stop.class.name.snakecase, stop_name: stop.name) rescue nil
                elsif remote_lock.present? and stop.remote_locks.blank?
                  remote_lock.update_attributes(stop_id: stop.id, stop_type: stop.class.name.snakecase, stop_name: stop.name) rescue nil
                end
            elsif lock_id == ""
                stop.remote_locks.update_all(stop_id: nil, stop_type: nil, stop_name: nil)
            end
        elsif community.locks_provider == "Zerv"

            if lock_id.present?
                zerv_lock = ZervLock.find_by(mac_id: lock_id, zerv_id: community.zerv.id) rescue nil
                if zerv_lock.present? and stop.zerv_locks.present? and stop.zerv_locks.last.mac_id != zerv_lock.mac_id
                    stop.zerv_locks.update_all(stop_id: nil, stop_type: nil)
                    zerv_lock.update_attributes(stop_id: stop.id, stop_type: stop.class.name) rescue nil
                elsif zerv_lock.present? and stop.zerv_locks.blank?
                    zerv_lock.update_attributes(stop_id: stop.id, stop_type: stop.class.name) rescue nil
                end
            elsif lock_id == ""
                stop.zerv_locks.update_all(stop_id: nil, stop_type: nil)
            end
        end
    end

    def all_locks(community_id)
        community = Community.where(id: community_id).includes({edge_state: [:remote_locks]}, {dwelo: [:remote_locks]}, {latch: [:latch_locks]}, {zerv: [:zerv_locks]}).first
        edge_state_locks =  community.edge_state.remote_locks.sort_by { |l| l.id}.collect{ |l| {name: (l.name + " (" + l.remote_lock_type + ")"), id: (l.device_id)} }
        dwelo_locks      =  community.dwelo.remote_locks.sort_by      { |l| l.id}.collect{ |l| {name: (l.name + " (" + l.remote_lock_type + ")"), id: (l.device_id)} }
        latch_locks      =  community.latch.latch_locks.sort_by       { |l| l.id}.collect{ |l| {name:  l.lock_name, id: l.door_uuid} }
        zerv_locks       =  community.zerv.zerv_locks.sort_by         { |l| l.id}.collect{ |l| {name: (l.sub_location_name + " (" + l.sub_location_friendly_name + ")"), id: (l.mac_id)} }
        return {edgestate_locks: edge_state_locks, dwelo_locks: dwelo_locks, latch_locks: latch_locks, zerv_locks: zerv_locks}
    end

end
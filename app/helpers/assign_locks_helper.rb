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
        end
    end
end
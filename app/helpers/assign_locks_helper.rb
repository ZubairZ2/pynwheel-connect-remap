module AssignLocksHelper
  def assign_lock(community, stop, lock_id)
    case stop.lock_provider
    when "Latch"
      assign_latch_lock(community, stop, lock_id)
    when "Dwelo"
      assign_dwelo_lock(community, stop, lock_id)
    when "EdgeState"
      assign_edgestate_lock(community, stop, lock_id)
    when "Zerv"
      assign_zerv_lock(community, stop, lock_id)
    when "Igloohome"
      assign_igloohome_lock(community, stop, lock_id)
    end
  end

  def all_locks(community_id)
    community = Community.where(id: community_id).includes({igloohome: [:igloohome_locks], edge_state: [:remote_locks]}, {dwelo: [:remote_locks]}, {latch: [:latch_locks]}, {zerv: [:zerv_locks]}).first
    edge_state_locks =  community.edge_state.present? ? community.edge_state.remote_locks.sort_by { |l| l.id}.collect{ |l| {name: (l.name + " (" + l.remote_lock_type + ")"), id: (l.device_id), stop_id: (l.stop_id) } } : []
    dwelo_locks      =  community.dwelo.present?      ? community.dwelo.remote_locks.sort_by      { |l| l.id}.collect{ |l| {name: (l.name + " (" + l.remote_lock_type + ")"), id: (l.device_id), stop_id: (l.stop_id) } } : []
    latch_locks      =  community.latch.present?      ? community.latch.latch_locks.sort_by       { |l| l.id}.collect{ |l| {name:  l.lock_name, id: l.lock_id, stop_id: (l.stop_id) } } : []
    zerv_locks       =  community.zerv.present?       ? community.zerv.zerv_locks.sort_by         { |l| l.id}.collect{ |l| {name: (l.sub_location_name + " (" + l.sub_location_friendly_name + ")"), id: (l.mac_id), stop_id: (l.stop_id) } } : []
    igloohome_locks = community.igloohome.present? ? community.igloohome.igloohome_locks.sort_by { |l| l.id}.collect{ |l| {name: l.device_name, id: l.device_id } } : []
    {igloohome_locks: igloohome_locks, edgestate_locks: edge_state_locks, dwelo_locks: dwelo_locks, latch_locks: latch_locks, zerv_locks: zerv_locks}
  end

  def existing_locks_provider(community)
    locks_present_hash = {}
    locks_present_hash["Dwelo"] = community.multiple_locks_provider.include?("Dwelo") && community.dwelo.present? && community.dwelo.remote_locks.dwelo_locks.present?
    locks_present_hash["EdgeState"] = community.multiple_locks_provider.include?("EdgeState") && community.edge_state.present? && community.edge_state.remote_locks.edgestate_locks.present?
    locks_present_hash["Latch"] = community.multiple_locks_provider.include?("Latch") && community.latch.present? && community.latch.latch_locks.present?
    locks_present_hash["Zerv"] = community.multiple_locks_provider.include?("Zerv") && community.zerv.present? && community.zerv.zerv_locks.present?
    locks_present_hash["Igloohome"] = community.multiple_locks_provider.include?("Igloohome") &&  community.igloohome.present? && community.igloohome.igloohome_locks.present?

    return locks_present_hash
  end

  def assign_lock_to_door(community, door, lock_id)
    if door.lock_provider == "Latch"

      if lock_id.present?
        latch_lock = LatchLock.find_by(lock_id: lock_id, latch_id: community.latch.id) rescue nil

        if latch_lock.present? and door.latch_lock.present? and door.latch_lock.lock_id != latch_lock.lock_id
          latch_lock.stop.update_column(:lock_provider, "")   if latch_lock.stop.present?
          door.latch_lock.update(stop_id: nil, stop_type: nil)
          latch_lock.update(stop_id: door.id, stop_type: door.class.name) rescue nil
        elsif latch_lock.present? and door.latch_lock.blank?
          latch_lock.stop.update_column(:lock_provider, "")   if latch_lock.stop.present?
          latch_lock.update(stop_id: door.id, stop_type: door.class.name) rescue nil
        end
      elsif lock_id == ""
        door.latch_lock.update(stop_id: nil, stop_type: nil) if door.latch_lock.present?
        door.update_column(:lock_provider, "")
      end
    
    elsif door.lock_provider == "Dwelo"

      if lock_id.present?
        dwelo_lock = RemoteLock.find_by(device_id: lock_id, dwelo_id: community.dwelo.id, edge_state_id: nil) rescue nil

        if dwelo_lock.present? and door.dwelo_lock.present? and door.dwelo_lock.device_id != dwelo_lock.device_id
          dwelo_lock.stop.update_column(:lock_provider, "")   if dwelo_lock.stop.present?
          door.dwelo_lock.update(stop_id: nil, stop_type: nil)
          dwelo_lock.update(stop_id: door.id, stop_type: door.class.name) rescue nil
        elsif dwelo_lock.present? and door.dwelo_lock.blank?
          dwelo_lock.stop.update_column(:lock_provider, "")   if dwelo_lock.stop.present?
          dwelo_lock.update(stop_id: door.id, stop_type: door.class.name) rescue nil
        end
      elsif lock_id == ""
          door.dwelo_lock.update(stop_id: nil, stop_type: nil) if door.dwelo_lock.present?
          door.update_column(:lock_provider, "")
      end
    elsif door.lock_provider == "EdgeState"

        if lock_id.present?
          edgestate_lock = RemoteLock.find_by(device_id: lock_id, edge_state_id: community.edge_state.id, dwelo_id: nil) rescue nil

          if edgestate_lock.present? and door.edgestate_lock.present? and door.edgestate_lock.device_id != edgestate_lock.device_id
            edgestate_lock.stop.update_column(:lock_provider, "")   if edgestate_lock.stop.present?
            door.edgestate_lock.update(stop_id: nil, stop_type: nil)
            edgestate_lock.update(stop_id: door.id, stop_type: door.class.name) rescue nil
          elsif edgestate_lock.present? and door.edgestate_lock.blank?
            edgestate_lock.stop.update_column(:lock_provider, "")   if edgestate_lock.stop.present?
            edgestate_lock.update(stop_id: door.id, stop_type: door.class.name) rescue nil
          end
        elsif lock_id == ""
          door.edgestate_lock.update(stop_id: nil, stop_type: nil) if door.edgestate_lock.present?
          door.update_column(:lock_provider, "")
        end
    elsif door.lock_provider == "Zerv"
      if lock_id.present?
        zerv_lock = ZervLock.find_by(mac_id: lock_id, zerv_id: community.zerv.id) rescue nil
      
        if zerv_lock.present? and door.zerv_lock.present? and door.zerv_lock.mac_id != zerv_lock.mac_id
          zerv_lock.stop.update_column(:lock_provider, "")  if zerv_lock.stop.present?
          door.zerv_lock.update(stop_id: nil, stop_type: nil)
          zerv_lock.update(stop_id: door.id, stop_type: door.class.name) rescue nil
        elsif zerv_lock.present? and door.zerv_lock.blank?
          zerv_lock.stop.update_column(:lock_provider, "") if zerv_lock.stop.present?
          zerv_lock.update(stop_id: door.id, stop_type: door.class.name) rescue nil
        end
      elsif lock_id == ""
        door.zerv_lock.update(stop_id: nil, stop_type: nil) if door.zerv_lock.present?
        door.update_column(:lock_provider, "")
      end
    elsif door.lock_provider == "Igloohome"
      assign_igloohome_lock_to_door(community, door, lock_id)
    end
  end

  def assign_igloohome_lock_to_door community, door, lock_id
    if lock_id.present?
      igloohome_lock = IgloohomeLock.find_by(device_id: lock_id, igloohome_id: community.igloohome.id) rescue nil
    
      if igloohome_lock.present? and door.igloohome_lock.present? and door.igloohome_lock.device_id != igloohome_lock.device_id
        igloohome_lock.stop.update_column(:lock_provider, "")  if igloohome_lock.stop.present?
        door.igloohome_lock.update(stop_id: nil, stop_type: nil)
        igloohome_lock.update(stop_id: door.id, stop_type: door.class.name) rescue nil
      elsif igloohome_lock.present? and door.igloohome_lock.blank?
        igloohome_lock.stop.update_column(:lock_provider, "") if igloohome_lock.stop.present?
        igloohome_lock.update(stop_id: door.id, stop_type: door.class.name) rescue nil
      end
    elsif lock_id == ""
      door.igloohome_lock.update(stop_id: nil, stop_type: nil) if door.igloohome_lock.present?
      door.update_column(:lock_provider, "")
    end
  end

  def assign_latch_lock community, stop, lock_id
    if lock_id.present?
      latch_lock = LatchLock.find_by(lock_id: lock_id, latch_id: community.latch.id) rescue nil
      if latch_lock.present? and stop.latch_locks.present? and stop.latch_locks.last.lock_id != latch_lock.lock_id
        latch_lock.stop.update_column(:lock_provider, "") rescue nil
        stop.latch_locks.update_all(stop_id: nil, stop_type: nil)
        latch_lock.update(stop_id: stop.id, stop_type: stop.class.name) rescue nil
      elsif latch_lock.present? and stop.latch_locks.blank?
        latch_lock.stop.update_column(:lock_provider, "") rescue nil
        latch_lock.update(stop_id: stop.id, stop_type: stop.class.name) rescue nil
      end

    elsif lock_id == ""
      stop.latch_locks.update_all(stop_id: nil, stop_type: nil) if stop.latch_locks.present?
      stop.update_column(:lock_provider, "")
    end
  end
  
  def assign_dwelo_lock community, stop, lock_id
    if lock_id.present?
      remote_lock = stop.lock_provider.constantize.find_by(community_id: community.id).remote_locks.dwelo_locks.find_by(device_id: lock_id) rescue nil
      
      if remote_lock.present? and stop.remote_locks.dwelo_locks.present? and stop.remote_locks.dwelo_locks.last.device_id != remote_lock.device_id
        remote_lock.stop_type.classify.constantize.find(remote_lock.stop_id).update_column(:lock_provider, "") rescue nil
        stop.remote_locks.dwelo_locks.update_all(stop_id: nil, stop_type: nil, stop_name: nil)
        remote_lock.update(stop_id: stop.id, stop_type: stop.class.name, stop_name: stop.name) rescue nil
      elsif remote_lock.present? and stop.remote_locks.dwelo_locks.blank?
        remote_lock.stop_type.classify.constantize.find(remote_lock.stop_id).update_column(:lock_provider, "") rescue nil
        remote_lock.update(stop_id: stop.id, stop_type: stop.class.name, stop_name: stop.name) rescue nil
      end
        
    elsif lock_id == ""
      stop.remote_locks.dwelo_locks.update_all(stop_id: nil, stop_type: nil, stop_name: nil) if stop.remote_locks.present?
      stop.update_column(:lock_provider, "")
    end
  end

  def assign_edgestate_lock community, stop, lock_id
    if lock_id.present?
      remote_lock = stop.lock_provider.constantize.find_by(community_id: community.id).remote_locks.edgestate_locks.find_by(device_id: lock_id) rescue nil

      if remote_lock.present? and stop.remote_locks.edgestate_locks.present? and stop.remote_locks.edgestate_locks.last.device_id != remote_lock.device_id
        remote_lock.stop_type.classify.constantize.find(remote_lock.stop_id).update_column(:lock_provider, "") rescue nil
        stop.remote_locks.edgestate_locks.update_all(stop_id: nil, stop_type: nil, stop_name: nil)
        remote_lock.update(stop_id: stop.id, stop_type: stop.class.name, stop_name: stop.name) rescue nil
      elsif remote_lock.present? and stop.remote_locks.edgestate_locks.blank?
        remote_lock.stop_type.classify.constantize.find(remote_lock.stop_id).update_column(:lock_provider, "") rescue nil
        remote_lock.update(stop_id: stop.id, stop_type: stop.class.name, stop_name: stop.name) rescue nil
      end

    elsif lock_id == ""
      stop.remote_locks.edgestate_locks.update_all(stop_id: nil, stop_type: nil, stop_name: nil) if stop.remote_locks.present?
      stop.update_column(:lock_provider, "")
    end
  end
  
  def assign_zerv_lock community, stop, lock_id
    if lock_id.present?
      zerv_lock = ZervLock.find_by(mac_id: lock_id, zerv_id: community.zerv.id) rescue nil
    
      if zerv_lock.present? and stop.zerv_locks.present? and stop.zerv_locks.last.mac_id != zerv_lock.mac_id
        zerv_lock.stop.update_column(:lock_provider, "") rescue nil
        stop.zerv_locks.update_all(stop_id: nil, stop_type: nil)
        zerv_lock.update(stop_id: stop.id, stop_type: stop.class.name) rescue nil
      elsif zerv_lock.present? and stop.zerv_locks.blank?
        zerv_lock.stop.update_column(:lock_provider, "") rescue nil
        zerv_lock.update(stop_id: stop.id, stop_type: stop.class.name) rescue nil
      end
    elsif lock_id == ""
      stop.zerv_locks.update_all(stop_id: nil, stop_type: nil) if stop.zerv_locks.present?
      stop.update_column(:lock_provider, "")
    end
  end

  def assign_igloohome_lock community, stop, lock_id
    if lock_id.present?
      igloohome_lock = IgloohomeLock.find_by(device_id: lock_id, igloohome_id: community.igloohome.id) rescue nil
    
      if igloohome_lock.present? and stop.igloohome_locks.present? and stop.igloohome_locks.last.device_id != igloohome_lock.device_id
        igloohome_lock.stop.update_column(:lock_provider, "") rescue nil
        stop.igloohome_locks.update_all(stop_id: nil, stop_type: nil)
        igloohome_lock.update(stop_id: stop.id, stop_type: stop.class.name) rescue nil
      elsif igloohome_lock.present? and stop.igloohome_locks.blank?
        igloohome_lock.stop.update_column(:lock_provider, "") rescue nil
        igloohome_lock.update(stop_id: stop.id, stop_type: stop.class.name) rescue nil
      end
    elsif lock_id == ""
      stop.igloohome_locks.update_all(stop_id: nil, stop_type: nil) if stop.igloohome_locks.present?
      stop.update_column(:lock_provider, "")
    end
  end
end
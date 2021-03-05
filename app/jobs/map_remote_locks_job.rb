class MapRemoteLocksJob < ApplicationJob
  
  include SuckerPunch::Job
  include AssignLocksHelper

  def perform(community, type)
    if type == "Dwelo"
      community.dwelo.remote_locks.dwelo_locks.each do |dwelo_lock|
        data = parse_stop(dwelo_lock.name,community)
        if data.present?
          puts '---'*150
          puts data
          remote_lock = Dwelo.find_by(community_id: community.id).remote_locks.dwelo_locks.find_by(stop_id: data.id) rescue nil
          remote_lock = Dwelo.find_by(community_id: community.id).remote_locks.dwelo_locks.find_by(name: data.name) rescue nil if remote_lock.nil?
          if remote_lock.present?
            remote_lock.stop_type.classify.constantize.find(remote_lock.stop_id).update_column(:lock_provider, "") rescue nil
            data.remote_locks.dwelo_locks.update_all(stop_id: nil, stop_type: nil, stop_name: nil)
            remote_lock.update_attributes(stop_id: data.id, stop_type: data.class.name.snakecase, stop_name: data.name) rescue nil
            data.update_column(:lock_provider, type)
          end
        end
      end
    elsif type == "EdgeState"
      community.edge_state.remote_locks.edgestate_locks.each do |edge_state_lock|
        data = parse_stop(edge_state_lock.name,community)
        if data.present?
          puts '---'*150
          puts data
          remote_lock = EdgeState.find_by(community_id: community.id).remote_locks.edgestate_locks.find_by(stop_id: data.id) rescue nil
          remote_lock = EdgeState.find_by(community_id: community.id).remote_locks.edgestate_locks.find_by(name: data.name) rescue nil if remote_lock.nil?
          if remote_lock.present?
            remote_lock.stop_type.classify.constantize.find(remote_lock.stop_id).update_column(:lock_provider, "") rescue nil
            data.remote_locks.edgestate_locks.update_all(stop_id: nil, stop_type: nil, stop_name: nil)
            remote_lock.update_attributes(stop_id: data.id, stop_type: data.class.name.snakecase, stop_name: data.name) rescue nil
            data.update_column(:lock_provider, type)
          end
        end
      end
    end
  end

end
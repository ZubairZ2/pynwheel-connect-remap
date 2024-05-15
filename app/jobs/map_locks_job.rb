class MapLocksJob < ApplicationJob
  include SuckerPunch::Job
  include AssignLocksHelper

  def perform(community, type)
    if community.zerv.present? and type == "Zerv"

      clear_locks_provider(community, type)
      community.zerv.zerv_locks.each do |zerv_lock|
        data = parse_stop(community, zerv_lock.sub_location_name)

        if data.present?
          data.zerv_locks.map{|z| z.update_attributes(stop_type: nil, stop_id: nil)}
          zerv_lock.update_columns(stop_type: data.class.to_s.classify, stop_id: data.id)
          data.update_column(:lock_provider, "Zerv")
        else
          zerv_lock.update_attributes(stop_id: nil, stop_type: nil)
        end
      end

    elsif community.edge_state.present? and type == "EdgeState"

      clear_locks_provider(community, type)
      community.edge_state.edgestate_locks.each do |edgestate_lock|
        data = parse_stop(community, edgestate_lock.name)
        if data.present?
            data.edgestate_locks.update_all(stop_id: nil, stop_type: nil, stop_name: nil)
            edgestate_lock.update_attributes(stop_id: data.id, stop_type: data.class.name.classify) rescue nil
            data.update_column(:lock_provider, type)
        else
          edgestate_lock.update_attributes(stop_id: nil, stop_type: nil, stop_name: nil)
        end
      end

    elsif community.edge_state.present? and type == "Igloohome"
      clear_locks_provider(community, type)
      community.igloohome.igloohome_locks.each do |igloohome_lock|
        data = parse_stop(community, igloohome_lock.device_name)
        auto_map_locks(community, data, type, igloohome_lock.device_id) if data.present?
      end

    elsif community.latch.present? and type == "Latch"
      clear_locks_provider(community, type)
      community.latch.latch_locks.each do |latch_lock|
        data = parse_stop(community, latch_lock.lock_name)
        auto_map_locks(community, data, type, latch_lock.lock_id) if data.present?
      end

    elsif community.dwelo.present? and type == "Dwelo"

      clear_locks_provider(community, type)
      community.dwelo.dwelo_locks.each do |dwelo_lock|
        data = parse_stop(community, dwelo_lock.name)

        if data.present?
          data.dwelo_locks.update_all(stop_id: nil, stop_type: nil, stop_name: nil)
          dwelo_lock.update_attributes(stop_id: data.id, stop_type: data.class.name.classify) rescue nil
          data.update_column(:lock_provider, type)
        else
          dwelo_lock.update_attributes(stop_id: nil, stop_type: nil, stop_name: nil)
        end
      end
      
    end

  end

  def clear_locks_provider(community, type)
    community.units.where(lock_provider: type).update_all(lock_provider: "")
    community.amenities.where(lock_provider: type).update_all(lock_provider: "")
    community.elevators.where(lock_provider: type).update_all(lock_provider: "")
    community.building_starting_point.where(lock_provider: type).update_all(lock_provider: "")
    community.community_tour.update(lock_provider: "") if community.community_tour.lock_provider === type
    community.doors.where(lock_provider: type).update_all(lock_provider: "")
  end

  def parse_stop(community, sub_location_name)
    data=nil

    if sub_location_name.include?('-')
        building_name, unit_name = sub_location_name.split('-',2)
    else
        building_name = nil
        unit_name = sub_location_name
    end

    if building_name == nil
        building_name_ = ''
    else
        building_name_ = building_name
    end

    data = community.units.where('(marketing_name = ? or provider_unit_id = ?) and (building = ? or building = ?)', unit_name, unit_name, building_name, building_name_).first rescue nil
    data = community.units.where('(marketing_name = ? or provider_unit_id = ?) and (building = ? or building = ?)', sub_location_name, sub_location_name, nil, '').first rescue nil unless data.present?
    data = community.units.where(marketing_name: sub_location_name).first rescue nil unless data.present?

    data = community.doors.where(name: sub_location_name).first if data.nil?
    data = community.amenities.where(name: sub_location_name).first if data.nil?
    data = community.elevators.where(name: sub_location_name).first if data.nil?
    data = community.building_starting_point.where(name: sub_location_name).first if data.nil?
    data = community.community_tour.name == sub_location_name ? community.community_tour : nil if data.nil?

    if data.nil? and sub_location_name.count('-') > 1
        (sub_location_name.count('-')+1).times.each do |i|
            if i >= 2
                building = (sub_location_name.split('-', i+1).first ((sub_location_name.split('-', i+1).length) -1)).join('-')
                unit_name = sub_location_name.split('-', i+1).last
                data = community.units.where('(marketing_name = ? or provider_unit_id = ?) and building = ?', unit_name, unit_name, building).first rescue nil
            end
            break if data.present?
        end
    end

    return data
  end

  private

    def auto_map_locks(community, data, type, lock_id)
      if data.class.name.classify.downcase == "amenity"
        if data.doors.present?
          update_door_lock(data, data.doors.last, type, community, lock_id)
        else
          update_stop_lock(data, type, community, lock_id)
        end
      else
        if data.door.present?
          update_door_lock(data, data.door, type, community, lock_id)
        else
          update_stop_lock(data, type, community, lock_id)
        end
      end
    end

    def update_door_lock(stop, door, type, community, lock_id)
      return unless lock_id.present?

      door.update_columns(lock_provider: type, access_code: lock_id, updated_at: Time.now.utc)
      stop.update_attributes(lock_provider: type, access_code: lock_id )

      assign_lock_to_door(community, door, lock_id)
    end

    def update_stop_lock(stop, type, community, lock_id)
      return unless lock_id.present?

      stop.update_attributes(lock_provider: type, access_code: lock_id )
      assign_lock(community, stop, lock_id) if lock_id.present?
    end

end
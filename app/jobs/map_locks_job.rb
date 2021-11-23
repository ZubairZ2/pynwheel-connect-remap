class MapLocksJob < ApplicationJob
  include SuckerPunch::Job

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
    community.tour.where(lock_provider: type).update_all(lock_provider: "")
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

    data = community.doors.where(name: sub_location_name).first if data.nil?
    data = community.amenities.where(name: sub_location_name).first if data.nil?
    data = community.elevators.where(name: sub_location_name).first if data.nil?
    data = community.building_starting_point.where(name: sub_location_name).first if data.nil?
    data = community.tour.name == sub_location_name ? community.tour : nil if data.nil?

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

end
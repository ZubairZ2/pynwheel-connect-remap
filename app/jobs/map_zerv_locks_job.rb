class MapZervLocksJob < ApplicationJob
    include SuckerPunch::Job
  
    def perform(community)
        community.zerv.zerv_locks.each do |zerv_lock|
            data = parse_stop(zerv_lock.sub_location_name,community)
            if data.present?
                data.zerv_locks.map{|z| z.update_attributes(stop_type: nil, stop_id: nil)}
                zerv_lock.update_columns(stop_type: data.class.to_s.classify, stop_id: data.id)
            end
        end
    end


    def parse_stop(sub_location_name,community)
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
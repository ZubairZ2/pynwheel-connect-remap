class InsertZervLocksJob < ApplicationJob
    include SuckerPunch::Job

    def perform(locks, zerv)
        community = zerv.community
        location_name = (community.company.name + ' - ' + community.name).downcase.parameterize.gsub("-", "").gsub("_", "")
        community_locks = locks["listGetDevices"].map{|lock| lock if lock["locationName"].present? && ( (lock["locationName"].downcase.parameterize.gsub("-", "").gsub("_", "") == location_name) || (community.address.present? && match_address(lock["locationName"], community.address) ) )}.compact

        unless community_locks.blank?
            community_locks.each do |lock|
                zerv_lock = zerv.zerv_locks.find_by(mac_id: lock["deviceMACId"]) rescue nil
                if zerv_lock.nil?
                    ZervLock.create(
                        mac_id: lock["deviceMACId"], is_device_active: lock["active"], location_name: lock["locationName"],
                        location_friendly_name: lock["locationFriendlyName"], sub_location_name: lock["subLocationName"],
                        sub_location_friendly_name: lock["subLocationFriendlyName"],
                        universal_access_code: lock["universalAccessCode"], zerv_id: zerv.id)
                else
                    zerv_lock.update(
                        is_device_active: lock["active"], location_name: lock["locationName"],
                        location_friendly_name: lock["locationFriendlyName"], sub_location_name: lock["subLocationName"],
                        sub_location_friendly_name: lock["subLocationFriendlyName"], universal_access_code: lock["universalAccessCode"])
                end
            end
        end
    end

    def match_address zerv_device_addr, property_addr
        device_address = zerv_device_addr.split(",")
        street_address = device_address[0]
        street_address == property_addr
    end
  

end
module DweloDevicesHelper
  def dwelo_client_credentials(community_dwelo_account)
    @dwelo_user = Dwelo.find_by(community_id: community_dwelo_account.community_id)
    if @dwelo_user.present?
      auth_url = "https://api.dwelo.com/v3/oauth/access_token"
      get_token_response = HTTParty.post(auth_url,
                                         body: {
                                             client_id: community_dwelo_account.client_id,
                                             client_secret: community_dwelo_account.client_secret,
                                             grant_type: "client_credentials"
                                         },
                                         headers: {'Content-Type' => 'application/x-www-form-urlencoded'})
      @token = get_token_response["access_token"]
    end
  end

  def update_dweloo_device(access_token, updated_device_data)
    token_type = "Bearer"
    auth_header = token_type + " " + access_token

    url = base_url + "/v4/integrations/pynwheel/devices/"

    response = HTTParty.put(url,
                            body: [{
                                "lock_id": updated_device_data.device_id,
                                "name": updated_device_data.name

                            }].to_json,
                            :headers => {'Authorization' => auth_header,
                                         'Accept' => 'application/vnd.lockstate+json; version=1',
                                         'Content-Type' => 'application/json'})
    return response
  end

  def update_deivces_in_db(response, dwelo_user)
    devices = response["data"]
    available_ids = []
    if devices.present?
      devices.each do |device|
        type = device["type"]
        name = device["attributes"]["name"]
        # serial_number = device["attributes"]["serial_number"]
        device_id = device["id"]
        # rml = RemoteLock.find_by(device_id: device_id, edge_state_id: @edge_state_user.id)
        remote_lock = RemoteLock.find_by(device_id: device_id, dwelo_id: dwelo_user.id)
        if remote_lock.nil?
          # remote_lock = RemoteLock.create(device_id: device_id, remote_lock_type: type, name: name, edge_state_id: @edge_state_user.id)
          remote_lock = RemoteLock.create(device_id: device_id, remote_lock_type: type, name: name, dwelo_id: dwelo_user.id)
        elsif remote_lock.remote_lock_type != type or remote_lock.name != name
          remote_lock.update_attributes(remote_lock_type: type, name: name)
        end
        available_ids << remote_lock.id
      end
      RemoteLock.where(dwelo_id: dwelo_user.id).where.not(id: available_ids).delete_all
    # else
    #   flash[:notice] = "Something went wrong, please check your credentials."
    #   # render :js => "window.location = '/communities/#{dwelo_user.community_id}/dwelos/new'"
    #   return false
    end
    # render json: {locks: RemoteLock.all}
  end

  def create_dwelo_access_guest(access_token, tour_user, current_time)
      token_type = "Bearer"
      auth_header = token_type + " " + access_token
      id = SecureRandom.random_number(100000000)
      tour_user.update!(random_number: id)
      url = base_url + "/v4/integrations/pynwheel/access_persons/"

      start_time = Time.now.utc.strftime('%Y-%m-%dT%H:%M:%SZ')
      ends_time = (Time.now.utc + 90.minutes).strftime('%Y-%m-%dT%H:%M:%SZ')
      puts start_time
      puts ends_time

      request_body = { type: "access_guest", id: tour_user.random_number, starts_at: start_time, ends_at: ends_time }
      puts "--------------------------- create access_persons request ----------------------------"
      puts request_body


      response = HTTParty.post(url,
                               body: {
                                   type: "access_guest",
                                   id: tour_user.random_number,
                                   starts_at: start_time,
                                   ends_at: ends_time
                               }.to_json,
                               :headers => {'Authorization' => auth_header,
                                            'Accept' => 'application/vnd.lockstate+json; version=1',
                                            'Content-Type' => 'application/json'})

      puts "--------------------------- create access_persons response ----------------------------"
      puts response
      return response
  end

  def delete_dwelo_access_guest(access_token, guest_id)

      token_type = "Bearer"
      auth_header = token_type + " " + access_token

      url = base_url + "/v4/integrations/pynwheel/access_persons/"

      response = HTTParty.delete(url,
                                 :headers => {'Authorization' => auth_header,
                                              'Accept' => 'application/vnd.lockstate+json; version=1',
                                              'Content-Type' => 'application/json'},
                                 :body => [guest_id].to_json)


      return response

  end

  def grant_dwelo_user_access(access_token, access_person_id, accessible_id)

      token_type = "Bearer"
      auth_header = token_type + " " + access_token

      url = base_url + "/v4/integrations/pynwheel/access_persons/accesses/"

      response = HTTParty.post(url,
                               body: {
                                   "access_person_id": access_person_id,
                                   "lock_id": accessible_id,
                               }.to_json,
                               :headers => {'Authorization' => auth_header,
                                            'Accept' => 'application/vnd.lockstate+json; version=1',
                                            'Content-Type' => 'application/json'})

      puts "------------------- create grant_access_person_accesses response -----------------------"
      puts response
      puts "----------------------------------------------------------------------------------------"

      return response

  end

  def base_url
    "https://api.dwelo.com"
  end


  def get_scheduled_tours(community_id, tour_user_id, time_param)
    current_tour = get_current_tour(time_param)
    SchedualTour.where('community_id = ? and tour_user_id = ? and tour_date = ?', community_id, tour_user_id, current_tour.tour_date).order(:id)
  end

  def is_tour_on_time(time_param, scheduled_tours, grace_time)
    current_tour = get_current_tour(time_param)

    before_margin = current_tour.tour_time - grace_time.minutes
    after_margin = current_tour.tour_time + grace_time.minutes

    scheduled_tours.where(tour_time: before_margin..after_margin).last
  end

  def get_current_tour(time_param)
    current_datetime = time_param.to_datetime.strftime('%d/%m/%Y %l:%M %p')
    current_time = current_datetime.to_datetime.strftime('%l:%M %p')
    current_date = current_datetime.to_datetime.strftime('%d/%m/%Y')
    current_tour = SchedualTour.new(tour_date: current_date, tour_time: current_time)
  end

  def check_community_type(in_visiting_hours, tours, community, tour_user)
    if in_visiting_hours == true
      if tours.first.only_scheduled_tour
        scheduled_tours = get_scheduled_tours(community.id, tour_user.id, current_time)
        if scheduled_tours.present?
          is_tour_ontime = is_tour_on_time(current_time, scheduled_tours, tours.first.grace_period)
          is_tour_virtual = is_tour_ontime.nil? ? true : false
        else
          is_tour_virtual = true
        end
      else
        is_tour_virtual = false
      end
    else
      is_tour_virtual = true
    end

    is_tour_virtual
  end

  def lock_access_by_type(params, community, tour_user)
    if community.multiple_locks_provider.include?("Dwelo")
      dwelo_lock_access(params, community)
    end

    if community.multiple_locks_provider.include?("EdgeState")
      edgestate_lock_Access(params, community)
    end
    
    if community.multiple_locks_provider.include?("Latch")
      create_latch_reservation(community, tour_user, DateTime.now.utc)
    end
  end

  def dwelo_lock_access(params, community)
    Thread.new do
      tour_user = TourUser.find params[:tour_user_id]
      access_token = dwelo_client_credentials(providers_account)
      prev_data = tour_user.as_guests.find_by(community_id: params[:id])

      # ----------- creating a guest for remote lock (type = locks) ----------------- #
      unless prev_data.present? 
        response = create_dwelo_access_guest(access_token, tour_user, current_time)
        dwelo_tour_user = tour_user.as_guests.create!(community_id: params[:id],  guest_id: response["id"], dwelo_guest: true)
      else
        delete_dwelo_access_guest(access_token, prev_data.guest_id)
        response = create_dwelo_access_guest(access_token, tour_user, current_time)
        prev_data.update_attributes!(guest_id: response["id"])
      end

      allowed_stops = locks_with_same_type("Dwelo", community)

      dwelo = Dwelo.find_by(community_id: community.id)
      locks = RemoteLock.where(stop_id: allowed_stops, dwelo_id: dwelo.id).pluck(:device_id, :remote_lock_type)
      
      if locks.present?
        tour_user_guest_id = tour_user.as_guests.find_by(community_id: community.id).guest_id

        locks.each do |lock|
          grant_dwelo_user_access(access_token, tour_user_guest_id, lock[0])
        end
      end
    end
  end

  def edgestate_lock_Access(params, community)
    Thread.new do
      tour_user = TourUser.find params[:tour_user_id]
      access_token = RemoteLockService.new(community).client_credentials
      prev_data = tour_user.as_guests.where(community_id: params[:id])
      # ----------- creating a guest for remote lock (type = locks) ----------------- #
      unless prev_data.present?
        response = RemoteLockService.new(community).create_access_guest(access_token,tour_user,current_time)
        tour_user.as_guests.create(community_id: params[:id], edgestate_pin: response["data"]["attributes"]["pin"], guest_id: response["data"]["id"])
      else
        RemoteLockService.new(community).delete_access_guest(access_token,prev_data.last.guest_id)
        response = RemoteLockService.new(community).create_access_guest(access_token,tour_user,current_time)
        prev_data.last.update_attributes(edgestate_pin: response["data"]["attributes"]["pin"], guest_id: response["data"]["id"])
      end
      # ------------ creating guest and granting access for igloo lock -------------------------------- #
      allowed_stops = locks_with_same_type("EdgeState", community)
      locks = RemoteLock.where(stop_id: allowed_stops, edge_state_id: community.edge_state.id, remote_lock_type: "igloo_lock").pluck(:device_id, :stop_id)
     
      if locks.present?
        igloo_guest_ids = @tour_user.igloo_guests.where(community_id: community.id, status: "active").map{|x| x.guest_id} rescue ''
        locks.each do |lock|
            response = RemoteLockService.new(community).create_igloo_guests(access_token, @tour_user, lock[0] ,current_time)
            @tour_user.igloo_guests.create(community_id: community.id, stop_id: lock[1], guest_type: response["data"]["type"],  guest_code: response["data"]["attributes"]["code"], guest_id: response["data"]["id"], status: "active") unless response["status"] == 500
        end
        igloo_guest_ids.map{ |guest_id| RemoteLockService.new(community).delete_igloo_guests(access_token, guest_id) unless guest_id == ''}
        IglooGuest.where(guest_id: igloo_guest_ids).update_all(status: 'deleted')
      end
    end
  end

  def create_latch_reservation(community, tour_user, start_time)
    Thread.new do
      end_time = start_time + 90.minutes

      stops_arr = community.tour.tour_stops.where(display_stop: true).order(:sort)
      stops_ids = stops_arr.ids

      unit_ids = TourStop.where(id: stops_ids, stop_type: "unit").pluck(:stop_id)
      amenity_ids = TourStop.where(id: stops_ids, stop_type: "amenity").pluck(:stop_id)
      elevator_ids = TourStop.where(id: stops_ids, stop_type: "elevator").pluck(:stop_id)
      building_starting_point_ids = TourStop.where(id: stops_ids, stop_type: "building_starting_point").pluck(:stop_id)
      
      units = Unit.where(id: unit_ids, lock_provider: "Latch").includes(:latch_locks)
      amenities = Amenity.where(id: amenity_ids, lock_provider: "Latch").includes(:latch_locks)
      elevators = Elevator.where(id: elevator_ids, lock_provider: "Latch").includes(:latch_locks)
      building_starting_points = BuildingStartingPoint.where(id: building_starting_point_ids, lock_provider: "Latch").includes(:latch_locks)

      locks_data = []
      locks_data << community.tour.latch_locks.pluck(:lock_id, :stop_type, :stop_id).flatten if community.tour.latch_locks.present?
      
      units.each do |unit|
        lock_info = unit.latch_locks.pluck(:lock_id, :stop_type, :stop_id).flatten
        locks_data << lock_info if lock_info.present? and locks_data.map{|x| x if x[0] == lock_info[0]}.compact.flatten.length == 0
      end
      
      amenities.each do |amenity|
        lock_info = amenity.latch_locks.pluck(:lock_id, :stop_type, :stop_id).flatten
        locks_data << lock_info if lock_info.present? and locks_data.map{|x| x if x[0] == lock_info[0]}.compact.flatten.length == 0
      end
      
      elevators.each do |elevator|
        lock_info = elevator.latch_locks.pluck(:lock_id, :stop_type, :stop_id).flatten
        locks_data << lock_info if lock_info.present? and locks_data.map{|x| x if x[0] == lock_info[0]}.compact.flatten.length == 0
      end

      building_starting_points.each do |building_starting_point|
        lock_info = building_starting_point.latch_locks.pluck(:lock_id, :stop_type, :stop_id).flatten
        locks_data << lock_info if lock_info.present? and locks_data.map{|x| x if x[0] == lock_info[0]}.compact.flatten.length == 0
      end

      if locks_data.present?
        LatchGuest.where(tour_user_id: tour_user.id, community_id: community.id).update_all(status: "deleted")
        locks_data.each do |lock_info|
          response = LatchCreateReservationService.call(
            community_id: community.id,
            startTime: start_time,
            endTime: end_time,
            keyIds: lock_info[0],
            tour_user: tour_user,
            allowedKeycardCount: 0
          )

          latch_link = response["payload"]["message"]["link"]

          if latch_link.present?
            LatchLock.where(lock_id: lock_info[0]).map{|stop_data| tour_user.latch_guests.create(community_id: community.id, latch_link: latch_link, guest_of_stop_type: stop_data.stop_type , guest_of_stop_id: stop_data.stop_id, start_time: start_time.to_i, end_time: end_time.to_i, status: "active") if stop_data.stop_type.present? and stop_data.stop_id.present?}
          end
        end
      end
    end
  end

  def locks_with_same_type(type, community, allowed_stops = [])
    visible_stops = community.tour.tour_stops.where(display_stop: true).pluck(:stop_type, :stop_id).

    visible_stops.each do |stop|
      if (stop[0].classify.constantize.find_by_id stop[1]).lock_provider == type
        allowed_stops << stop[1]
      end
    end

    allowed_stops << community.tour.id if community.tour.lock_provider == type
  end

  def zerv_multiple_stops_access community
    available_stops = community.tour.tour_stops.where(display_stop: true).pluck(:stop_type, :stop_id)

    available_stops.each do |stop|
      if (stop[0].classify.constantize.find_by_id stop[1]).lock_provider == "Zerv"
        allowed_stops << [stop[0], stop[1]]
      end
    end

    allowed_stops << ["tour", community.tour.id] if community.tour.lock_provider == "Zerv"
    
    allowed_stops.map{ |stop| stop[0].classify.constantize.find_by_id stop[1] }.compact
  end

  def is_tour_in_visiting_hours(time_param, community)
    current_time = time_param.strftime("%H:%M")
    current_day = time_param.strftime('%A')
    community.opening_hours.where('day = ? and opening_time <= ? and closing_time >= ?', current_day, current_time, current_time).present?
  end

  def check_tour_type(tour_status, nearest_tour_id, tour, is_tour_ontime)
    if is_tour_ontime.present? 
      return is_tour_ontime.tour_type
    elsif nearest_tour_id.present? && (tour_status == "on time" || !tour.only_scheduled_tour)
      st = SchedualTour.find nearest_tour_id
      return st.tour_type
    else
      return (!tour.only_scheduled_tour ? "self_tour" : "virtual")
    end
  end

  def sf_nearest_time_tour(community, tour_user, current_time, timezone)
    tours_exist = false; on_time_tour=nil; nearest_tour=nil; time_status=nil;

    response = SalesforceServices::GetBookingByNeighbor.call(community: community, tour_user: tour_user)
    if response.success? and response.payload.present?
      today_scheduled_tours = response.payload.find_all{ |b| ( (b["Account__r"]["Name"].downcase.parameterize.gsub("-", "").gsub("_", "") == @community.name.downcase.parameterize.gsub("-", "").gsub("_", "")) and b["Status__c"] == "Scheduled" and b["Tour_Start_Time__c"].to_datetime.in_time_zone(timezone).strftime("%Y-%m-%d") == Time.now.in_time_zone(timezone).strftime("%Y-%m-%d")) }
      if tours_exist = today_scheduled_tours.present?
        on_time_tour = is_sf_tour_on_time(today_scheduled_tours, current_time, community.tour.grace_period, timezone)
        current_tour = on_time_tour
        unless on_time_tour.present?
          time_status , nearest_tour = sf_tour_time_status(today_scheduled_tours, current_time, timezone)
          current_tour = nearest_tour
        end
        
        Prospect.where(community_id: community.id,  tour_user_id: tour_user.id, crm_provider: "salesforce").update_all(sf_status: "deleted")
        Prospect.create(community_id: community.id,  tour_user_id: tour_user.id, data_provider: community.data_provider, crm_provider: "salesforce", sf_booking_id: current_tour["Id"], sf_booking_name: current_tour["Name"], sf_guest_id: current_tour["Contact__r"]["Id"], sf_status: "active")
      end
    end

    OpenStruct.new({tours_exist: tours_exist, on_time_tour: on_time_tour, nearest_tour: nearest_tour, time_status: time_status})
  end

  def nearest_time_tour(community, tour_user, current_time)
    tours_exist = false; on_time_tour=nil; nearest_tour=nil; time_status=nil;

    today_scheduled_tours = get_scheduled_tours(community.id, tour_user.id, current_time)
    if tours_exist = today_scheduled_tours.present?
      on_time_tour = is_tour_on_time(today_scheduled_tours, current_time, community.tour.grace_period)
      unless on_time_tour.present?

        time_status , nearest_tour = tour_time_status(today_scheduled_tours, current_time)
      end
    end

    OpenStruct.new({tours_exist: tours_exist, on_time_tour: on_time_tour, nearest_tour: nearest_tour, time_status: time_status})
  end

  def current_community_time(community)
    timezone = get_community_time_zone(community)
    (timezone != "UTC") ? Time.now.in_time_zone(timezone) : (params[:current_time].present? ? params[:current_time].to_datetime : Time.now.in_time_zone(timezone))
  rescue
    Time.now.utc
  end

  def check_guest_limit(community, property_time, limit, tour_user)
    
    if community.tour.tour_setting.do_limit_max_tour
      return (limit <= (app_usage(community, property_time, limit, tour_user) + total_scheduled_tour(community,property_time, limit, tour_user)) ? true : false)
    else
      return false
    end
  end

  def total_scheduled_tour(community, property_time, limit, tour_user)
    timezone = get_community_time_zone(community) rescue "UTC"
    total  = SchedualTour.where('tour_date = ?', Date.today.to_date).where.not(tour_user_id: nil).map{|x| x if ( ((((x.tour_date.to_s + " " + x.tour_time.to_s(:time)).in_time_zone(x.user_time_zone).in_time_zone(timezone)) - property_time.in_time_zone(timezone) ) / 3600).between?(-0.5,0.5) )}.compact
    if (total.map{|x| x.tour_user_id}.include? tour_user.id) || !geo_distance(tour_user.latitude,tour_user.longitude,community.latitude, community.longitude, 1)
      return 0
    else
      total_count = total.count
      return total_count
    end
  end

  def app_usage(community, property_time, limit ,tour_user)
    unless geo_distance(tour_user.latitude,tour_user.longitude,community.latitude, community.longitude, 1)
      return 0
    else
      return TourHistory.where(left: nil, abandoned_tour_at_stop: nil,active_app: true, is_virtual_tour: false,tour_id: community.tour.id).where('arrived > ?', (property_time - 120.minutes)).map{|x| x if(geo_distance(x.latitude,x.longitude,community.latitude, community.longitude, 1)) }.compact.count
    end    
  end

  def geo_distance(lat1, long1, lat2, long2, kilometer)
    return ((Geocoder::Calculations.distance_between([lat1,long1],[lat2,long2],options = {:units => :km}) < kilometer) rescue true)
  end

  def get_community_time(community)
    tz = Ziptz.new
    if community.zip.present?
        timezone = tz.time_zone_name(community.zip)
        community_time = Time.now.in_time_zone(timezone) if timezone.present?
    end

    if community_time.nil? and community.latitude.present? and community.longitude.present?
        timezone = Timezone.lookup(community.latitude, community.longitude)
        community_time = timezone.utc_to_local(Time.now) if timezone.present?
    end

    community_time.present? ? community_time : nil
  end

  def get_community_time_zone(community)
    tz = Ziptz.new
    timezone = nil

    if community.zip.present?
        timezone = tz.time_zone_name(community.zip)
    end

    if timezone.nil? and community.latitude.present? and community.longitude.present?
        time_zone = Timezone.lookup(community.latitude, community.longitude)
        timezone = time_zone.name
    end

    return timezone.present? ? timezone : "UTC"
    
    rescue
      return "UTC"
  end

  def is_sf_tour_on_time(current_time, scheduled_tours, grace_time, timezone)
    before_margin = current_time - grace_time.minutes
    after_margin = current_time + grace_time.minutes
    scheduled_tours.find_all{ |t| t["Tour_Start_Time__c"].to_datetime.in_time_zone(timezone) >= before_margin and  t["Tour_Start_Time__c"].to_datetime.in_time_zone(timezone) <= after_margin}.last
  end
  
  def tour_time_status(time_param, grace_time, scheduled_tours)
    current_tour = get_current_tour(time_param)
    nearest_before_time = scheduled_tours.where("tour_time > ?" , current_tour.tour_time).map{|x| [(x.tour_time - current_tour.tour_time).abs, x.id]}.min        # nearest before time , remember min function will be applied at the first index of array, which is deliberately set to time
    nearest_after_time  = scheduled_tours.where("tour_time < ?" , current_tour.tour_time).map{|x| [(x.tour_time - current_tour.tour_time).abs, x.id]}.min        # nearest after time  , remember min function will be applied at the first index of array, which is deliberately set to time

    if nearest_before_time.present? and nearest_after_time.nil?
      return ["before time" , nearest_before_time[1]]
    elsif nearest_before_time.nil? and nearest_after_time.present?
      return ["after time" , nearest_after_time[1]]
    end

    if nearest_before_time[0] < nearest_after_time[0]
      return ["before time" , nearest_before_time[1]]
    elsif nearest_after_time[0] < nearest_before_time[0]
      return ["after time" , nearest_after_time[1]]
    else
      return ["after time" , nearest_after_time[1]] # if the difference b/w after and before is same, we will pick the upcoming scheduled tour i.e after time tour
    end
  end

  def sf_tour_time_status(current_time, scheduled_tours, grace_time, timezone)
    nearest_before_time = scheduled_tours.map{ |t| [(t["Tour_Start_Time__c"].to_datetime.in_time_zone(timezone) - current_time).abs , t["Id"]] if t["Tour_Start_Time__c"].to_datetime.in_time_zone(timezone) < current_time }.compact.min
    nearest_after_time = scheduled_tours.map{ |t| [(t["Tour_Start_Time__c"].to_datetime.in_time_zone(timezone) - current_time).abs , t["Id"]] if t["Tour_Start_Time__c"].to_datetime.in_time_zone(timezone) > current_time }.compact.min

    if nearest_before_time.present? and nearest_after_time.nil?
      return ["before time" , scheduled_tours.find{|s| s["Id"] == nearest_before_time[1]}]
    elsif nearest_before_time.nil? and nearest_after_time.present?
      return ["after time" , scheduled_tours.find{|s| s["Id"] == nearest_after_time[1]}]
    end

    if nearest_before_time[0] < nearest_after_time[0]
      return ["before time" , scheduled_tours.find{|s| s["Id"] == nearest_before_time[1]}]
    elsif nearest_after_time[0] < nearest_before_time[0]
      return ["after time" , scheduled_tours.find{|s| s["Id"] == nearest_after_time[1]}]
    else
      return ["after time" , scheduled_tours.find{|s| s["Id"] == nearest_after_time[1]}] # if the difference b/w after and before is same, we will pick the upcoming scheduled tour i.e after time tour
    end
  end
end

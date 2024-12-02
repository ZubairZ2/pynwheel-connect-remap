class AccessLogsService
  def create_access_log tour_user_id, community_id, stop_ids, lock_type, payload=nil, response=nil, url=nil, is_resident=false
    AccessLog.create!( 
      tour_user_id: tour_user_id,
      community_id: community_id, 
      stop_ids: stop_ids, 
      lock_type: lock_type, 
      payload: payload, 
      response: response, 
      url: url, 
      is_resident: is_resident
    )
  end

  def get_filtered_tours_access_logs params, response
    AccessLog.create!( 
      tour_user_id: params[:tour_user_id],
      response: response, 
    )
  end

  def funnel_logs community_id, msg, payload, response
    AccessLog.create!( 
      community_id: community_id,
      lock_type: "funnel",
      payload: "#{msg} ----------- #{payload}",
      response: response
    )
  end

  def scheduler_widget_logs community_id, params, err_response
    AccessLog.create!( 
      community_id: community_id,
      lock_type: "scheduler_widget_scheduled_tour",
      payload: params,
      response: err_response
    )
  end

  def create_crm_logs tour_user_id, community_id, payload, response
    AccessLog.create!( 
      tour_user_id: tour_user_id,
      community_id: community_id, 
      payload: payload, 
      response: response, 
    )
  end
end
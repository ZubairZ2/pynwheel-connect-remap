class AccessLogsService
  def create_access_log tour_user_id, community_id, stop_ids, lock_type, payload, response, url, is_resident
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
end
class ImportRemotelockEventsJob < ApplicationJob
  include SuckerPunch::Job

  def perform(tour_user, tour_history, assigned_pin)
		community = (Tour.find_by_id tour_history.tour_id).community
		as_guests_data = tour_user.as_guests.find_by(community_id: community.id) if community.present?
    tour_history.lock_histories.destroy_all
    
    if as_guests_data.present?
      email_content = "Events for #{tour_user.name} with tour id #{tour_user.id} are imported in pynwheel as a backgroubjob, while the tour history id is #{tour_history.id} and the assigned pin is #{assigned_pin}" if tour_user.present? and tour_user.as_guests.present?
  		DelayedSchedulerMailerJob.perform_async("Remote Lock Events, BackGroud Job", email_content, "humza4142@gmail.com","Lock History has been imported","check the database, BackGroud Job, its ran in  BackGroud Job","humza4142@gmail.com") if tour_user.present? and tour_user.as_guests.present?

      access_token = RemoteLockService.new(community).client_credentials

      page = 1
      while page <= 5 do
        responce = RemoteLockService.new(community).get_all_events(access_token,page)
        responce["data"].each do |event|
          if active_user_exists(event,as_guests_data.guest_id)  
            occurred_at = event["attributes"]["occurred_at"].to_datetime.in_time_zone(event["attributes"]["time_zone"]).strftime('%a, %d %b %Y %H:%M:%S').to_datetime
            rml = RemoteLock.find_by(device_id: event["attributes"]["publisher_id"])
            tour_history.lock_histories.create(event: event["type"], occured_at: occurred_at, stop_id: rml.stop_id, stop_name: rml.stop_name, stop_type: rml.stop_type , tour_user_id: tour_user.id)
          
          elsif expire_user_exists(event, tour_user.name, assigned_pin)
            
            occurred_at = event["attributes"]["occurred_at"].to_datetime.in_time_zone(event["attributes"]["time_zone"]).strftime('%a, %d %b %Y %H:%M:%S').to_datetime
            rml = RemoteLock.find_by(device_id: event["attributes"]["publisher_id"])
            tour_history.lock_histories.create(event: event["type"], occured_at: occurred_at, stop_id: rml.stop_id, stop_name: rml.stop_name, stop_type: rml.stop_type , tour_user_id: tour_user.id)
 
          elsif sync_events_exists(event,as_guests_data.guest_id) # just for testing
            
            occurred_at = event["attributes"]["occurred_at"].to_datetime.in_time_zone(event["attributes"]["time_zone"]).strftime('%a, %d %b %Y %H:%M:%S').to_datetime
            rml = RemoteLock.find_by(device_id: event["attributes"]["publisher_id"])
            tour_history.lock_histories.create(event: event["type"], occured_at: occurred_at, stop_id: rml.stop_id, stop_name: rml.stop_name, stop_type: rml.stop_type , tour_user_id: tour_user.id)
          
          end
          
        end
        page = page + 1
      end
    end
    
  end

  def active_user_exists(event,guest_id)
    return (event["type"] == "unlocked_event" and event["attributes"]["source"] == "user" and  event["attributes"]["status"] == "succeeded" and event["attributes"]["associated_resource_id"].present? and event["attributes"]["associated_resource_id"] == guest_id)
  end
  
  def expire_user_exists(event,name,pin)
    return (event["type"] == "unlocked_event" and event["attributes"]["source"] == "user" and  event["attributes"]["status"] == "succeeded" and  event["attributes"]["associated_resource_name"] == name and event["attributes"]["method"] == "pin" and event["attributes"]["pin"] == pin)
  end

  def sync_events_exists(event,guest_id)
    return (event["type"] == "access_person_synced_event" and event["attributes"]["source"] == "user" and event["attributes"]["status"] == "succeeded" and event["attributes"]["associated_resource_id"].present? and event["attributes"]["associated_resource_id"] == guest_id)
  end

end

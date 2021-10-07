class Api::V1::PerqWebhooksController < ActionController::Base
  before_action :get_community_by_property_id, only: :perq_tour_webhook
  before_action :get_community_by_name, only: :perq_tour_webhook
  before_action :get_tour_user_by_email, only: :perq_tour_webhook
  before_action :set_perq_tour_user, only: :perq_tour_webhook

  def perq_tour_webhook
    if is_required_params_present
      tour_in_future = get_tour_in_future
      if tour_in_future.present? && !tour_in_future.is_tour_completed
        previous_tour = get_previous_tour(tour_in_future)
        update_scheduled_tour(tour_in_future)
        schedual_tour = SchedualTour.find_by_id tour_in_future.id
        perq_tour_confirmation(schedual_tour, previous_tour, true)

        render :json => {:success=>true, :message => "You already have tour in future, tour is updated successfully with new submitted data", :status => 200}
      else
        create_scheduled_tour(get_latest_tour())
        schedual_tour = SchedualTour.last
        perq_tour_confirmation(schedual_tour, nil, false)
        
        render :json => {:success=>true, :message => "New tour is scheduled successfully", :status => 200}
      end
    else
      render :json => {:success=>false, :message => "Something is wrong, please verify the params", :status => 401}
    end
  end

  private

  def get_previous_tour schedual_tour
    {
      tour_date: schedual_tour.tour_date,
      tour_time: schedual_tour.tour_time,
      is_rescheduled: schedual_tour.tour_user_id.present?
    }
  end

  def perq_tour_confirmation schedual_tour, previous_tour, is_rescheduled
    SchedulerWidgetService.new(@community).send_email_and_other_notifications(schedual_tour, previous_tour, is_rescheduled)
  end

  def is_required_params_present
    (@community.present? && @community.self_tour && @community&.credential&.is_perq_allowed && params["Email"].present? && params["FirstName"].present? && params["LastName"].present? && params["TourType"].present? && params["Phone"].present? && params["AppointmentDateTime"].present? && (params["ClientName"].present? || params["ClientID"].present?) )
  end

  def create_scheduled_tour tour
    SchedualTour.create!(
      stops_list: tour.present? ? get_tour_stops_list(tour) : [], 
      community_id: @community.id, 
      tour_user_id: @tour_user.id,
      user_time_zone: get_community_time_zone, 
      tour_date: get_tour_date(params["AppointmentDateTime"]), 
      tour_time: get_tour_time(params["AppointmentDateTime"]), 
      tour_type: get_tour_type, 
      created_by: "PERQ"
    )
  end

  def update_scheduled_tour tour
    tour.update_attributes!(
      tour_date: get_tour_date(params["AppointmentDateTime"]), 
      tour_time: get_tour_time(params["AppointmentDateTime"]), 
      tour_type: get_tour_type
    )
  end

  def get_tour_type
    params["TourType"] === "Self-Guided" ? "self_tour" : params["TourType"] === "Guided" ? "guided_tour" : ""
  end

  def get_tour_date tour_date_time
    date = Date.strptime(tour_date_time, '%m/%d/%Y')  if tour_date_time.present?
    date.strftime('%Y-%m-%d')  if date.present?
  end

  def get_tour_time tour_date_time
    time_array = tour_date_time.split(" ")
    time = nil

    if time_array.present? && time_array[2].present? && time_array[2] === "PM"
      temp = time_array[1].split(":") if time_array.present? && time_array[1].present?
      time = Time.strptime("#{temp[0]}pm", "%I%P").strftime("%H:%M:S") if temp.present? && temp[0].present?
    else
      time = time_array[1] if time_array.present? && time_array[1].present?
    end

    time.present? ? time : DateTime.now.strftime("%H:%M")
  end

  def get_tour_stops_list tour
    tour.stops_list rescue []
  end

  def set_perq_tour_user
    unless @tour_user.present?
      create_perq_tour_user
    else
      update_perq_tour_user
    end
  end

  def create_perq_tour_user
    @tour_user ||= TourUser.create!(      
      first_name: params["FirstName"], 
      last_name: params["LastName"], 
      name: "#{params["FirstName"]} #{params["LastName"]}", 
      email: params["Email"].downcase, 
      phone_number: "+1#{params["Phone"]}"
    )
  end

  def update_perq_tour_user
    @tour_user.update_attributes!(
      first_name: params["FirstName"], 
      last_name: params["LastName"], 
      name: "#{params["FirstName"]} #{params["LastName"]}",
      phone_number: "+1#{params["Phone"]}"
    )
  end

  def get_tour_user_by_email
    @tour_user ||= TourUser.where(email: params["Email"].downcase).last if params["Email"].present?
  end

  def get_community_by_name
    @community ||= Community.where(name: params["ClientName"]).last if params["ClientName"].present?
  end

  def get_community_by_property_id
    credentials = Credential.where(perq_property_id: params["ClientID"]).last if params["ClientID"].present?
    @community ||= credentials.community if credentials&.community.present?
  end

  def get_tour_in_future
    MaxDateScheduledTourService.new(@tour_user, @community, true).get_scheduled_tour if @tour_user.present? &&  @community.present?
  end

  def get_latest_tour
    MaxDateScheduledTourService.new(@tour_user, @community, false).get_scheduled_tour if @tour_user.present? &&  @community.present?
  end

  def get_community_time_zone
    tz = Ziptz.new
    timezone = nil

    if @community.latitude.present? and @community.longitude.present?
      time_zone = Timezone.lookup(@community.latitude, @community.longitude)
      timezone = time_zone.name
    end

    if timezone.nil? and @community.zip.present?
      timezone = tz.time_zone_name(@community.zip)
    end

      return timezone
    rescue
      return "UTC"
  end

end
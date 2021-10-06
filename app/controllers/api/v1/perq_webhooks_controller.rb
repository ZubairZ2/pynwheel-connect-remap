class Api::V1::PerqWebhooksController < ActionController::Base
  before_action :perq_community_by_property_id, only: :perq_tour_webhook
  before_action :perq_community_by_name, only: :perq_tour_webhook
  before_action :perq_tour_user_by_email, only: :perq_tour_webhook
  before_action :set_perq_tour_user, only: :perq_tour_webhook

  def perq_tour_webhook
    if is_required_params_present
      tour_in_future = get_tour_in_future
      if tour_in_future.present? && !tour_in_future.is_tour_completed
        update_scheduled_tour(tour_in_future)

        render :json => {:success=>true, :message => "You already have tour in future, tour is updated successfully with new submitted data", :status => 200}
      else
        tour = get_latest_tour
        create_scheduled_tour(tour)

        render :json => {:success=>true, :message => "New tour is scheduled successfully", :status => 200}
      end
    else
      render :json => {:success=>false, :message => "Something is wrong, please verify the params", :status => 401}
    end
  end

  private

  def is_required_params_present
    (@perq_community.present? && @perq_community&.credential&.is_perq_allowed && params["Email"].present? && params["FirstName"].present? && params["LastName"].present? && params["TourType"].present? && params["Phone"].present? && params["AppointmentDateTime"].present? && (params["ClientName"].present? || params["ClientID"].present?) )
  end

  def create_scheduled_tour tour
    SchedualTour.create!(
      stops_list: tour.present? ? get_tour_stops_list(tour) : [], 
      community_id: @perq_community.id, 
      tour_user_id: @perq_tour_user.id,
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
    params["TourType"] === "Self-Guided" ? "self_tour" : params["TourType"] === "Guided" ? "guided" : ""
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
    unless @perq_tour_user.present?
      create_perq_tour_user
    else
      update_perq_tour_user
    end
  end

  def create_perq_tour_user
    @perq_tour_user ||= TourUser.create!(      
      first_name: params["FirstName"], 
      last_name: params["LastName"], 
      name: "#{params["FirstName"]} #{params["LastName"]}", 
      email: params["Email"].downcase, 
      phone_number: "+1#{params["Phone"]}"
    )
  end

  def update_perq_tour_user
    @perq_tour_user.update_attributes!(
      first_name: params["FirstName"], 
      last_name: params["LastName"], 
      name: "#{params["FirstName"]} #{params["LastName"]}",
      phone_number: "+1#{params["Phone"]}"
    )
  end

  def perq_tour_user_by_email
    @perq_tour_user ||= TourUser.where(email: params["Email"].downcase).last if params["Email"].present?
  end

  def perq_community_by_name
    @perq_community ||= Community.where(name: params["ClientName"]).last if params["ClientName"].present?
  end

  def perq_community_by_property_id
    credentials = Credential.where(perq_property_id: params["ClientID"]).last if params["ClientID"].present?
    @perq_community ||= credentials.community if credentials&.community.present?
  end

  def get_tour_in_future
    MaxDateScheduledTourService.new(@perq_tour_user, @perq_community, true).get_scheduled_tour if @perq_tour_user.present? &&  @perq_community.present?
  end

  def get_latest_tour
    MaxDateScheduledTourService.new(@perq_tour_user, @perq_community, false).get_scheduled_tour if @perq_tour_user.present? &&  @perq_community.present?
  end

  def get_community_time_zone
    tz = Ziptz.new
    timezone = nil

    if @perq_community.latitude.present? and @perq_community.longitude.present?
      time_zone = Timezone.lookup(@perq_community.latitude, @perq_community.longitude)
      timezone = time_zone.name
    end

    if timezone.nil? and @perq_community.zip.present?
      timezone = tz.time_zone_name(@perq_community.zip)
    end

      return timezone
    rescue
      return "UTC"
  end

end
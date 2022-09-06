class Api::V1::SalesforceWebhooksController < ActionController::Base
  # before_action :set_tour_user, only: :salesforce_tour_webhook
  before_action :set_tour_user_by_email, only: [:salesforce_tour_webhook, :salesforce_cancel_tour_webhook]
  before_action :set_community_by_id
  before_action :set_community_by_name

  def salesforce_tour_webhook
    begin
      puts "<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< IN SALESFORCE WEBHOOK >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
      puts params.inspect

      if webhook_form_validate
        @tour_user = create_or_update_tour_user
        date = Date.strptime(params[:tourDate], '%m/%d/%Y')
        tour_date = date.strftime('%Y-%m-%d')  if date.present?
        scheduled_tours = @community&.schedual_tours&.where(tour_user_id: @tour_user.id)
        schedual_tour = scheduled_tours&.last
        stops_list = scheduled_tours.last.stops_list rescue []
        tour_is_in_future = is_tour_in_future(@community, schedual_tour, @community.get_time_zone()) 
        schedual_tour = schedule_salesforce_tour(schedual_tour, tour_is_in_future, stops_list, tour_date)
        if schedual_tour.present?
          render :json => {:success=> true, :message => "Salesforce tour submitted successfully", :status => 200}
        else
          render :json => {:success=> false, :message => "Salesforce tour could not be submitted", :status => 200}
        end
      end

    rescue Exception
      render :json => {:success=> false, :message => "Some Error occured", :status => 500}
    end
  end

  def salesforce_cancel_tour_webhook
    return unless @tour_user.present?
    destroy_salesforce_scheduled_tour
  end

  private

  def schedule_salesforce_tour schedual_tour, tour_is_in_future, stops_list, tour_date
    if schedual_tour.present? && !schedual_tour.is_tour_completed && tour_is_in_future
      puts "<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< SCHEDULE TOUR HAS BEEN UPDATED >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
      schedual_tour.update_attributes(salesforce_tour_booking_name: params[:tourBookingName], salesforce_tour_booking_id: params[:tourBookingId], stops_list: stops_list, community_id: @community&.id, tour_user_id: @tour_user.id ,user_time_zone: @community.get_time_zone(), tour_date: tour_date, tour_time: params[:tourTime] , tour_type: params[:tourType], created_by: "salesforce", created_at: Time.now)
    else
      puts "<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< SCHEDULE TOUR HAS BEEN CREATE >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
      schedual_tour = SchedualTour.create!(salesforce_tour_booking_name: params[:tourBookingName], salesforce_tour_booking_id: params[:tourBookingId], stops_list: stops_list, community_id: @community&.id, tour_user_id: @tour_user.id ,user_time_zone: @community.get_time_zone(), tour_date: tour_date, tour_time: params[:tourTime], tour_type: params[:tourType] , created_by: "salesforce")
    end

    schedual_tour
  end

  def create_or_update_tour_user
    if !@tour_user.present?
      @tour_user =  TourUser.create!(first_name: params[:neighborFirstName], last_name: params[:neighborLastName], name: (params[:neighborFirstName] + " " + params[:neighborLastName]), email: params[:neighborEmail].downcase, phone_number: make_phone_number)
    else
      @tour_user.update_attributes(first_name: params[:neighborFirstName], last_name: params[:neighborLastName], name: params[:neighborFirstName] + " " + params[:neighborLastName], email: params[:neighborEmail].downcase, phone_number: (make_phone_number).present? ? make_phone_number : @tour_user.phone_number) 
    end

    @tour_user
  end

  def destroy_salesforce_scheduled_tour
    schedual_tour = @tour_user.schedual_tours.where(created_by: "salesforce", community_id: @community&.id, salesforce_tour_booking_name: params[:tourBookingName], salesforce_tour_booking_id: params[:tourBookingId]).last
    schedual_tour.destroy if schedual_tour.present?
  end
  
  def set_community_by_id
    crm_credentials = CrmCredential.where(salesforce_property_id: params[:neighborhoodId]).last
    @community ||= crm_credentials&.community
  end

  def set_community_by_name
    @community ||= Community.where(name: params[:neighborhoodName]).last
  end

  def set_tour_user_by_email
    @tour_user ||= TourUser.where(email: params[:neighborEmail].downcase).last
  end

  def set_tour_user
    @tour_user ||= TourUser.where("lower(email) = ? OR phone_number = ?", params[:neighborEmail].downcase, make_phone_number)&.last
  end

  def webhook_form_validate
    if !params[:tourBookingName].present?
      render :json => {:success=> false, :message => "Tour Booking Name cannot be empty", :status => 400}
      return false
    elsif !params[:tourBookingId].present?
      render :json => {:success=> false, :message => "Tour Booking Id cannot be empty", :status => 400}
      return false
    elsif !params[:neighborEmail].present?
      render :json => {:success=> false, :message => "Email cannot be empty", :status => 400}
      return false
    elsif !params[:neighborLastName].present?
      render :json => {:success=> false, :message => "Last name cannot be empty", :status => 400}
      return false
    elsif !params[:neighborFirstName].present?
      render :json => {:success=> false, :message => "First name cannot be empty", :status => 400}
      return false  
    elsif !params[:tourDate].present?
      render :json => {:success=> false, :message => "Tour date cannot be empty", :status => 400}
      return false
    elsif !params[:tourTime].present?
      render :json => {:success=> false, :message => "Tour time cannot be empty", :status => 400}
      return false
    elsif !params[:tourType].present?
      render :json => {:success=> false, :message => "Tour type cannot be empty", :status => 400}
      return false
    else
      return true
    end  
  end

  def make_phone_number
    params[:neighborPhone].present? ? "+1#{params[:neighborPhone]&.tr('(), ,-', '')}" : ""
  end

  def is_tour_in_future(community, tour, timezone)
    if tour.present?
      if (tour.tour_date && tour.tour_time).present?
        (tour.tour_date.to_s + " " + tour.tour_time.strftime("%I:%M%p")).in_time_zone(timezone) > Time.now.in_time_zone(timezone)
      else
        return true
      end
    else
      return false
    end    
  end
end
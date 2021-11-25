class Api::V1::SalesforceWebhooksController < ActionController::Base
  before_action :set_tour_user, only: :salesforce_cancel_tour_webhook
  before_action :set_community_by_id, only: :salesforce_cancel_tour_webhook
  before_action :set_community_by_name, only: :salesforce_cancel_tour_webhook

  def salesforce_tour_webhook
    begin
    neighborEmail = params[:neighborEmail] if params[:neighborEmail].present?
    phone_number = params[:neighborPhone] rescue ""
    last_name = params[:neighborLastName] if params[:neighborLastName].present?
    first_name = params[:neighborFirstName] if params[:neighborFirstName].present?
    tourDate =  params[:tourDate] if params[:tourDate].present?
    tourTime = params[:tourTime] if params[:tourTime].present?
    tourType = params[:tourType] if params[:tourType].present?
    tourBookingId = params[:tourBookingId] if params[:tourBookingId].present?
    if webhook_form_validate(tourBookingId, neighborEmail, phone_number, last_name, first_name,tourDate, tourTime, tourType)
      @tour_user = TourUser.where(email: neighborEmail.downcase) if neighborEmail.present?
      @tour_user = @tour_user.last if @tour_user.present?
      if !@tour_user.present?
        @tour_user = TourUser.new(first_name: first_name,last_name: last_name, name: first_name + " " + last_name, email: neighborEmail.downcase, phone_number: phone_number)
        @tour_user.name = (first_name + " " + last_name)
        @tour_user.first_name = first_name
        @tour_user.last_name = last_name
        @tour_user.phone_number = phone_number if phone_number.present?
        @tour_user.save!
      else
        @tour_user.update_attributes(first_name: params[:neighborFirstName],last_name: params[:neighborLastName], name: params[:neighborFirstName] + " " + params[:neighborLastName], email: neighborEmail.downcase, phone_number: params[:neighborPhone]) 
      end
        neighborhoodName = params[:neighborhoodName] if params[:neighborhoodName].present?
        neighborhoodId = params[:neighborhoodId] if params[:neighborhoodId].present?
        if neighborhoodId.present?
          crm_credential = CrmCredential.find_by(salesforce_property_id: neighborhoodId) rescue "" 
          community = crm_credential.community if crm_credential.present? 
        end
        if neighborhoodId.present? && crm_credential.present? && community&.crm_credential&.salesforce_property_id == neighborhoodId        
          @community = community
        else
          @community = Community.find_by(name: neighborhoodName) rescue ""
        end
        timezone = @community.get_time_zone()
        community_id = @community&.id rescue ""
        date = Date.strptime(tourDate, '%m/%d/%Y')  if tourDate.present?
        tour_date = date.strftime('%Y-%m-%d')  if date.present?
        puts "<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< IN SALESFORCE WEBHOOK >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
        schedual_tour = @community&.schedual_tours&.where(tour_user_id: @tour_user.id).last
          scheduled_tours = @community&.schedual_tours&.where(tour_user_id: @tour_user.id)
          stops_list = scheduled_tours.last.stops_list rescue []
          tour_is_in_future = is_tour_in_future(@community,schedual_tour,timezone) 
          if schedual_tour.present? && !schedual_tour.is_tour_completed && tour_is_in_future
            schedual_tour.update_attributes(salesforce_tour_booking_id: tourBookingId, stops_list: stops_list, community_id: community_id, tour_user_id: @tour_user.id ,user_time_zone: timezone, tour_date: tour_date, tour_time: tourTime , tour_type: tourType, created_by: "salesforce", created_at: Time.now)
          else
            puts "<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< SCHEDULE TOUR HAS BEEN CREATE >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
            schedual_tour = SchedualTour.create!(salesforce_tour_booking_id: tourBookingId, stops_list: stops_list, community_id: community_id, tour_user_id: @tour_user.id ,user_time_zone: timezone, tour_date: tour_date, tour_time: tourTime, tour_type: tourType , created_by: "salesforce")
            schedual_tour.save!
          end

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
    return unless (@tour_user.present? &&  params[:tourBookingId].present?)
    destroy_salesforce_scheduled_tour
  end

  private

  def destroy_salesforce_scheduled_tour
    schedual_tour = @tour_user.schedual_tours.where(created_by: "salesforce", community_id: @community&.id, salesforce_tour_booking_id: params[:tourBookingId]).last
    schedual_tour.destroy if schedual_tour.present?
  end
  
  def set_community_by_id
    credentials = Credential.where(salesforce_property_id: params[:neighborhoodId]).last
    @community ||= credentials&.community
  end

  def set_community_by_name
    @community ||= Community.where(name: params[:neighborhoodName]).last
  end

  def set_tour_user
    @tour_user ||= TourUser.where(email: params[:neighborEmail].downcase).last
  end

  def webhook_form_validate(tourBookingId, neighborEmail, phone_number, last_name, first_name,tourDate, tourTime, tourType)
    if !tourBookingId.present?
      render :json => {:success=> false, :message => "Tour Booking cannot be empty", :status => 400}
      return false
    elsif !neighborEmail.present?
      render :json => {:success=> false, :message => "Email cannot be empty", :status => 400}
      return false
    elsif !phone_number.present?
      render :json => {:success=> false, :message => "Phone number cannot be empty", :status => 400}
      return false
    elsif !last_name.present?
      render :json => {:success=> false, :message => "Last name cannot be empty", :status => 400}
      return false
    elsif !first_name.present?
      render :json => {:success=> false, :message => "First name cannot be empty", :status => 400}
      return false  
    elsif !tourDate.present?
      render :json => {:success=> false, :message => "Tour date cannot be empty", :status => 400}
      return false
    elsif !tourTime.present?
      render :json => {:success=> false, :message => "Tour time cannot be empty", :status => 400}
      return false
    elsif !tourType.present?
      render :json => {:success=> false, :message => "Tour type cannot be empty", :status => 400}
      return false
    else
      return true
    end  

  end

  def is_tour_in_future(community,tour,timezone)
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
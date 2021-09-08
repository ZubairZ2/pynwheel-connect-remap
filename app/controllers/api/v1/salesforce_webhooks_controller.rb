class Api::V1::SalesforceWebhooksController < ActionController::Base

  def salesforce_tour_webhook
    # begin
    neighborEmail = params[:neighborEmail] if params[:neighborEmail].present?
    phone_number = params[:neighborPhone] rescue ""
    last_name = params[:neighborLastName] if params[:neighborLastName].present?
    first_name = params[:neighborFirstName] if params[:neighborFirstName].present?
    # @tour_user = TourUser.find_by(email: neighborEmail.downcase) if neighborEmail.present?
    @tour_user = TourUser.where(email: neighborEmail.downcase) if neighborEmail.present?
    @tour_user = @tour_user.last if @tour_user.present?
   if !@tour_user.present?
    @tour_user = TourUser.new(first_name: first_name,last_name: last_name, name: first_name + " " + last_name, email: neighborEmail.downcase, phone_number: phone_number)
    # end
    @tour_user.name = (first_name + " " + last_name)
    @tour_user.first_name = first_name 
    @tour_user.last_name = last_name
    @tour_user.phone_number = phone_number if phone_number.present?
    @tour_user.save!
     else
      @tour_user.update_attributes(first_name: params[:neighborFirstName],last_name: params[:neighborLastName], name: params[:neighborFirstName] + " " + params[:neighborLastName], email: neighborEmail.downcase, phone_number: params[:neighborPhone]) 
    end
      neighborhoodName = params[:neighborhoodName] if params[:neighborhoodName].present?
      @community = Community.find_by(name: neighborhoodName) rescue ""
      timezone = get_community_time_zone(@community) rescue "UTC"
      community_id = @community&.id rescue ""
      tourDate =  params[:tourDate] if params[:tourDate].present?
      date = Date.strptime(tourDate, '%m/%d/%Y')  if tourDate.present?
      tour_date = date.strftime('%Y-%m-%d')  if date.present?
      # if @tour_user.present?
      #   @scheduled_tour = @community&.schedual_tours.where(tour_user_id: @tour_user.id).last rescue ""
      # end
      # if @scheduled_tour.present?
        # new_tour = SchedualTour.find(@scheduled_tour.id)
      # else
      schedual_tour = @community&.schedual_tours&.where(tour_user_id: @tour_user.id).last
       #MaxDateScheduledTourService.new(@tour_user, @community, true).get_scheduled_tour #rescue @community&.schedual_tours&.where(tour_user_id: @tour_user.id)
      # if schedual_tour.present?
      #   new_tour = SchedualTour.find(schedual_tour.id)
      # else
      #   new_tour = SchedualTour.create!(community_id: community_id, tour_user_id: @tour_user.id ,user_time_zone: timezone, tour_date: tour_date, tour_time: params[:tourTime], tour_type: params[:tourType], created_by: "salesforce")
      #   new_tour.save
      # end
      # # if new_tour.save
        
      # # binding.pry
      #   if schedual_tour.present?
      #     new_tour.update(stops_list: schedual_tour.stops_list)
      #   else
      #     scheduled_tours = @community&.schedual_tours&.where(tour_user_id: @tour_user.id)
          
      #     if scheduled_tours.present?
      #       new_tour.update(stops_list: scheduled_tours.last.stops_list)
      #     end
      #   end
        scheduled_tours = @community&.schedual_tours&.where(tour_user_id: @tour_user.id)
        stops_list = scheduled_tours.last.stops_list if scheduled_tours.present?
        binding.pry 
        #st = schedual_tour.present? ? schedual_tour : new_tour 
        tour_is_in_future = is_tour_in_future(@community,schedual_tour,timezone)
        if schedual_tour.present? && !schedual_tour.is_tour_completed && tour_is_in_future
          schedual_tour.update_attributes(stops_list: stops_list, community_id: community_id, tour_user_id: @tour_user.id ,user_time_zone: timezone, tour_date: tour_date, tour_time: params[:tourTime], tour_type: params[:tourType], created_by: "salesforce")
        else
          schedual_tour = SchedualTour.create!(stops_list: stops_list, community_id: community_id, tour_user_id: @tour_user.id ,user_time_zone: timezone, tour_date: tour_date, tour_time: params[:tourTime], tour_type: params[:tourType], created_by: "salesforce")
          schedual_tour.save!
        end
        # schedual_tour = (schedual_tour.present? && !schedual_tour.is_tour_completed && tour_is_in_future) ? schedual_tour : new_tour
      # end
      # end
      

      # if @scheduled_tour.present?
      #   @stops_list = @scheduled_tour.stops_list
      #   @scheduled_tour.update_attributes(community_id: community_id, tour_user_id: @tour_user.id ,user_time_zone: timezone, tour_date: tour_date, tour_time: params[:tourTime], tour_type: params[:tourType], stops_list: @stops_list, created_by: "salesforce")
      # else
      #   @scheduled_tour = SchedualTour.new(community_id: community_id, tour_user_id: @tour_user.id ,user_time_zone: timezone, tour_date: tour_date, tour_time: params[:tourTime], tour_type: params[:tourType], created_by: "salesforce")
      #   @scheduled_tour.save
      # end
      # @schedule_tour = schedual_tour

     if schedual_tour.present?
      render :json => {:success=> true, :message => "Salesforce tour submitted successfully", :status => 200}
    else
      render :json => {:success=> false, :message => "Salesforce tour could not be submitted", :status => 200}
    end
  # rescue Exception
  #   render :json => {:success=> false, :message => "Internal Server Error", :status => 500}
  # end
  # puts "------------------------------"*50
  # puts "Salesforce Webhook"
  # puts params.inspect
  # puts "------------------------------"*50
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

  def get_community_time_zone(community)
    tz = Ziptz.new
    timezone = nil

    if community.latitude.present? and community.longitude.present?
      time_zone = Timezone.lookup(community.latitude, community.longitude)
      timezone = time_zone.name
    end

    if timezone.nil? and community.zip.present?
      timezone = tz.time_zone_name(community.zip)
    end

      return timezone
    rescue
      return "UTC"
  end
end
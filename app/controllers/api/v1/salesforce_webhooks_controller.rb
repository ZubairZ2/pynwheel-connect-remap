class Api::V1::SalesforceWebhooksController < ActionController::Base

  def salesforce_tour_webhook
    begin
    neighborEmail = params[:neighborEmail] if params[:neighborEmail].present?
    @tour_user = TourUser.find_by(email: neighborEmail.downcase) if neighborEmail.present?
    if @tour_user.nil?
      @tour_user = TourUser.new(first_name: params[:neighborFirstName],last_name: params[:neighborLastName], name: params[:neighborFirstName] + " " + params[:neighborLastName], email: neighborEmail.downcase, phone_number: params[:neighborPhone])
      @tour_user.save!
    else
      @tour_user.update_attributes(first_name: params[:neighborFirstName],last_name: params[:neighborLastName], name: params[:neighborFirstName] + " " + params[:neighborLastName], email: neighborEmail.downcase, phone_number: params[:neighborPhone]) 
    end
    neighborhoodName = params[:neighborhoodName] if params[:neighborhoodName].present?
    @community = Community.find_by(name: neighborhoodName) rescue ""
    timezone = get_community_time_zone(@community) rescue "UTC"
    community_id = @community&.id rescue ""
    tourDate =  params[:tourDate] if params[:tourDate].present?
    binding.pry
    date = Date.strptime(tourDate, '%m/%d/%Y')  if tourDate.present?
    tour_date = date.strftime('%Y-%m-%d')  if date.present?
    @scheduled_tour = @community&.schedual_tours.where(tour_user_id: @tour_user.id).last rescue ""
    
    if @scheduled_tour.present?
      @stops_list = @scheduled_tour.stops_list
      @scheduled_tour.update_attributes(community_id: community_id, tour_user_id: @tour_user.id ,user_time_zone: timezone, tour_date: tour_date, tour_time: params[:tourTime], tour_type: params[:tourType], stops_list: @stops_list, created_by: "salesforce")
    else
      @scheduled_tour = SchedualTour.new(community_id: community_id, tour_user_id: @tour_user.id ,user_time_zone: timezone, tour_date: tour_date, tour_time: params[:tourTime], tour_type: params[:tourType], created_by: "salesforce")
      @scheduled_tour.save
    end

    if @scheduled_tour.present?
      render :json => {:success=> true, :message => "Salesforce tour submitted successfully", :status => 200}
    else
      render :json => {:success=> false, :message => "Salesforce tour could not be submitted", :status => 200}
    end
  rescue Exception
    render :json => {:success=> false, :message => "Internal Server Error", :status => 500}
  end
    # puts "------------------------------"*50
    # puts "Salesforce Webhook"
    # puts params.inspect
    # puts "------------------------------"*50
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
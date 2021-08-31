class Api::V1::SalesforceWebhooksController < ActionController::Base

  def salesforce_tour_webhook
    @tour_user = TourUser.find_by(email: params[:neighborEmail].downcase)
    if @tour_user.nil?
      @tour_user = TourUser.new(first_name: params[:neighborFirstName],last_name: params[:neighborLastName], name: params[:neighborFirstName] + " " + params[:neighborLastName], email: params[:neighborEmail].downcase, phone_number: params[:neighborPhone])
      @tour_user.save!
    end
    @community = Community.find_by(name: params[:neighborhoodName]) || Community.find_by(show_property_map_key_text: params[:neighborhoodName]) || ""
    timezone = get_community_time_zone(@community) rescue "UTC"
    community_id = @community.id rescue ""
    @schedual_tour = SchedualTour.new(community_id: community_id, tour_user_id: @tour_user.id ,user_time_zone: timezone, tour_date: params[:tourDate], tour_time: params[:tourTime], tour_type: params[:tourType], created_by: "salesforce")
   
    if @schedual_tour.save
      render :json => {:success=>true, :message => "Salesforce tour submitted successfully", :status => 200}
    else
      render :json => {:success=>false, :message => "Salesforce tour could not be submitted", :status => 200}
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
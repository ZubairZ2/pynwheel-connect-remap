class Api::V1::SalesforceWebhooksController < ActionController::Base

  def salesforce_tour_webhook
    @tour_user = TourUser.find_by(email: params[:email])
    if @tour_user.nil?
      @tour_user = TourUser.new(first_name: params[:first_name],last_name: params[:last_name], name: params[:first_name], email: params[:email], phone_number: params[:phone_number])
      @tour_user.save!
    end
    @schedual_tour = SchedualTour.new(desired_move_in_date: params[:desired_move_in_date], desired_bedroom: params[:desired_bedroom], tour_date: params[:tour_date], tour_time: params[:tour_time], tour_type: params[:tour_type], created_by: "Salesforce")
    @tour_user.schedual_tours << @schedual_tour
    #@tour_user.save!
    #@schedual_tour.save!
    # puts "------------------------------"*50
    # puts "Salesforce Webhook"
    # puts params.inspect
    # puts "------------------------------"*50
    render :json => {:success=>true, :message => "Salesforce tour submitted successfully", :status => 200}
  end
end
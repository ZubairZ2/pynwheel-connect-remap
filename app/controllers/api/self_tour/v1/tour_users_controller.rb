class Api::SelfTour::V1::TourUsersController < ActionController::Base
  before_action :load_tour_user, only: :delete_account

  def delete_account
    if @tour_user.present?
      if destroy_user
        render :json=> {:status=>true, :message => "User account permanently deleted!", status_code: 200}
      else
        render :json=> {:status=>false, :message => "Something went wrong on server!", status_code: 500}
      end
    else
      render :json=> {:status=>false, :message => "User with Id #{params[:id]} not found!", status_code: 401}
    end
  end

  private

  def load_tour_user
    @tour_user ||= TourUser.find_by_id params[:id]
  end

  def destroy_user
    begin
      VisitedStop.where(tour_user_id: @tour_user&.id).destroy_all
      Feedback.where(tour_user_id: @tour_user&.id).destroy_all
      IglooGuest.where(tour_user_id: @tour_user&.id).destroy_all
      ZervGuest.where(tour_user_id: @tour_user&.id).destroy_all
      IgloohomeGuest.where(tour_user_id: @tour_user&.id).destroy_all
      AsGuest.where(tour_user_id: @tour_user&.id).destroy_all
      UserStripe.where(tour_user_id: @tour_user&.id).destroy_all
      TourHistory.where(tour_user_id: @tour_user&.id).destroy_all
      SchedualTour.where(tour_user_id: @tour_user&.id).destroy_all
      Prospect.where(tour_user_id: @tour_user&.id).destroy_all
      Chatroom.where(tour_user_id: @tour_user&.id).destroy_all
      LatchGuest.where(tour_user_id: @tour_user&.id).destroy_all
      Tour.where(tour_user_id: @tour_user&.id).destroy_all
      @tour_user.destroy!
      
    rescue
      false
    end
  end
end
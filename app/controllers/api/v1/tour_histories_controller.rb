class Api::V1::TourHistoriesController < ActionController::Base
  
  def save_tour_history
    if params[:community_id].present? && params[:tour_user_id].present?
      params[:id].present? ? tour_history = TourHistory.find_or_create_by(id: params[:id]) : tour_history = TourHistory.new

      tour_history.arrived = convert_epoch_to_datetime params[:arrived] if params[:arrived].present?
      tour_history.left = convert_epoch_to_datetime params[:left] if params[:left].present?
      tour_history.tour_id = params[:tour_id].to_i if params[:tour_id].present?
      tour_history.tour_status = params[:tour_status] if params[:tour_status].present?

      tour_history.lengthy_stay = convert_epoch_to_datetime params[:lengthy_stay] if params[:lengthy_stay].present?
      if params[:time_zone].present?
        tour_history.my_time_zone = params[:time_zone].to_s rescue nil
      end
      tour_history.abandoned_tour_at_stop = params[:abandoned_tour_at_stop] if params[:abandoned_tour_at_stop].present?
      tour_history.tour_user_id = params[:tour_user_id]
      @tour = Tour.find params[:tour_id]
      if !@tour.visual_id_verification
        begin
          tu = TourUser.find params[:tour_user_id]
          tu.id_selfie_mismatch = false
          tu.save
        rescue => ex
        end
      end
      tour_history.id_mismatch = tour_history.tour_user.id_selfie_mismatch rescue false
      
      tour_history.community = set_community
      chatroom = Chatroom.find_by(tour_user_id: params[:tour_user_id], tour_id: params[:tour_id])
      if chatroom.present?
        if params[:last_msg_id].present?
          count = Chat.where("name = ? AND chatroom_id = ? AND id > ?", "Support Team", chatroom.id, params[:last_msg_id]).count
        else
          count = 0
        end
      else
        count = 0
      end
      if tour_history.save
        render :json=> {:success=>true, :message => "success", :un_read_msgs_count=> count, :data => tour_history}
      else
        render :json=> {:success=>false, :message => "tour history was not saved, please try again."}
      end
    else
      render :json=> {:success=>false, :message => "Please provide community_id."}
    end
  end

  def change_id_selfie_status
    if params[:tour_user_id].present? && params[:id_selfie_mismatch_status].present?
      
      tour_user = TourUser.find_by_id(params[:tour_user_id])
      if tour_user.present?
        tour_user.id_selfie_mismatch = params[:id_selfie_mismatch_status]
        if tour_user.save
          render :json=> {:success=>true, :message => "status changed"}
        else
          render :json=> {:success=>false, :message => "tour user status was not changed."}
        end
      else
        render :json=> {:success=>false, :message => "tour user was not found against this id, please try again."}
      end

    else
      render :json=> {:success=>false, :message => "tour_user_id and id_selfie_mismatch_status are compulsory."}
    end
  end

  def get_tour_history

    tour_history = TourHistory.find_by(id: params[:id])
    all_ids = TourHistory.pluck :id
    if tour_history.present?
      render :json=> {:success=>true, :message => "success", :data => tour_history}
    else
      render :json=> {:success=>false, :message => "tour history was not found against this id, please try again.", available_ids: all_ids}
    end
  end

  private

  def convert_epoch_to_datetime epoch_str
    Time.strptime(epoch_str, '%s')
  end
  def tour_history_params
    params.permit(:arrived, :left, :lengthy_stay, :id_mismatch, :abandoned_tour_at_stop, :tour_user_id, :community_id)
  end

  def set_community
    @community ||= Community.find_by_id params[:community_id] if params[:community_id].present?
  end
end
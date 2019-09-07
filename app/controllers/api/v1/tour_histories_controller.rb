class Api::V1::TourHistoriesController < ActionController::Base
  
  def save_tour_history
    params[:id].present? ? tour_history = TourHistory.find_or_create_by(id: params[:id]) : tour_history = TourHistory.new

    tour_history.arrived = convert_epoch_to_datetime params[:arrived] if params[:arrived].present?
    tour_history.left = convert_epoch_to_datetime params[:left] if params[:left].present?

    tour_history.lengthy_stay = convert_epoch_to_datetime params[:lengthy_stay] if params[:lengthy_stay].present?

    tour_history.id_mismatch = false
    tour_history.abandoned_tour_at_stop = params[:abandoned_tour_at_stop] if params[:abandoned_tour_at_stop].present?
    tour_history.tour_user_id = params[:tour_user_id] if params[:tour_user_id].present?
    
    # binding.pry
    # Time.at(params[:lengthy_stay])
    if tour_history.save
      render :json=> {:success=>true, :message => "success", :data => tour_history}
    else
      render :json=> {:success=>false, :message => "tour history was not saved, please try again."}
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
    params.permit(:arrived, :left, :lengthy_stay, :id_mismatch, :abandoned_tour_at_stop, :tour_user_id)
  end
end
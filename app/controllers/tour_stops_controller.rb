class TourStopsController < ApplicationController
  def resetTourStopPoint
    @community = Community.find params[:community_id]
    if params[:id].include?(':')
      @tour_stop = TourStop.find_by(stop_id: params[:id].split(':')[0])
    else
      @tour_stop = TourStop.find params[:id]
    end

    if @tour_stop.present?
      @tour_stop.destroy
      redirect_to select_stops_community_tours_path(@community)
    end
  end
end

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
  def destroy
    @tour_stop = TourStop.find params[:id]
    path = @tour_stop.stop_type.classify.constantize.find_by_id(@tour_stop.stop_id).paths.last
    path.path_points.destroy_all if path.present?
    path.destroy if path.present?

    paths = Path.where(map_path_from_id: @tour_stop.stop_id)
    paths.each do |path|
      path.path_points.destroy_all
      path.destroy if path.present?
    end
    # path = @tour_stop.stop_type.classify.constantize.find_by_id(@tour_stop.stop_id).paths.last
    # path.path_points.destroy_all if path.present?
    VisitedStop.where(tour_stop_id: @tour_stop.id).destroy_all
    if @tour_stop.destroy
      redirect_to community_tours_path(current_community,floorNo = (params[:floorplate].present? ? params[:floorplate] : nil)), :notice => "Tour Stop deleted"
    else
      redirect_to community_tours_path(current_community)
    end
  end
end

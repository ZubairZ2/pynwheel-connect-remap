class Api::V2::ToursController < Api::V2::ApiApplicationController

  before_action :load_community
  before_action :load_tour
  before_action :load_tour_stop, only: [:delete_tour_stop]

  def index
    if @tour.present?
      render json: {success: true, data: @tour.as_json}
    else
      render json: {success: false, message: "No Tour Found"}
    end
  end

  def add_tour_stops
    
  end

  def delete_tour_stop
    # Can be moved to background worker
    remove_associated_path
    remove_associated_visited_stops
    remove_associated_elevator
    remove_associated_elevator

    if @tour_stop.destroy! 
      render json: {success: true, message: "Tour stop deleted successfully!"}
    else
      render json: {success: false, message: "Something went wrong!"}
    end
  end

  private

  def remove_associated_path
    paths = Path.where(map_path_from_id: @tour_stop.stop_id)

    paths.each do |path|
      path.path_points.destroy_all
      path.destroy
    end

    path = @tour_stop.stop_type.classify.constantize.find_by_id(@tour_stop.stop_id)&.paths&.last
    path&.path_points&.destroy_all
    path&.destroy
  end

  def remove_associated_visited_stops
    VisitedStop.where(tour_stop_id: @tour_stop.id).destroy_all
  end

  def remove_associated_elevator
    return unless (@tour_stop.stop_type == "elevator")
    (Elevator.find @tour_stop.stop_id).destroy if Elevator.where(id: @tour_stop.stop_id).any?
  end

  def remove_associated_elevator
    return unless (@tour_stop.stop_type == "building_starting_point")
    (BuildingStartingPoint.find @tour_stop.stop_id).destroy if BuildingStartingPoint.where(id: @tour_stop.stop_id).any?
  end

  def load_community
    @community = Community.find params[:community_id]

    rescue ActiveRecord::RecordNotFound
      render json: {success: false, error_code: 400, message: 'Community not found', data: nil}, status: :not_found
	end

  def load_tour
    @tour = @community.community_tour || @community.create_tour
	end

  def load_tour_stop
    @tour_stop = TourStop.find params[:tour_stop_id]
    rescue ActiveRecord::RecordNotFound
      render json: {success: false, error_code: 400, message: 'Tour Stop not found', data: nil}, status: :not_found
  end

end
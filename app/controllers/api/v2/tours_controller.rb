class Api::V2::ToursController < Api::V2::ApiApplicationController

  before_action :load_community
  before_action :load_tour

  def index
    if @tour.present?
      render json: {success: true, data: @tour.as_json}
    else
      render json: {success: false, message: "No Tour Found"}
    end
  end

  def update_tour_stops

  end

  def add_tour_stops
  end

  def delete_tour_stop

  end


  private

  def fetch_tour_stops
    @tour_stops = @tours.present? ? @tours.tour_stops : nil

  end

  def load_community
    @community = Community.find params[:community_id]

    rescue ActiveRecord::RecordNotFound
      render json: {success: false, error_code: 400, message: 'Community not found', data: nil}, status: :not_found
	end

  def load_tour
    @tour = @community.community_tour || @community.create_tour
	end
end
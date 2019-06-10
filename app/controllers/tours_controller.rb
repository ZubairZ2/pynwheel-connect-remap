class ToursController < ApplicationController
  def index
    @community = Community.find params[:community_id]
    @tours = @community.tour || @community.create_tour
    @tour_stops = @tours.present? ? @tours.tour_stops : nil
  end
  def save_tour_settings
    @community = Community.find params[:community_id]
    @tours = @community.tour
  end
  def starting_point
    @community = Community.find params[:community_id]
    @tours = @community.tour
    @sitemap = @community.sitemap
    @amenities = @community.amenities
  end
  def save_starting_point

    @community = Community.find params[:community_id]
    @tours = @community.tour
    @tours.name = params[:name].present? ? params[:name] : ""
    @tours.latitude = params[:latitude].present? ? params[:latitude] : ""
    @tours.longitude = params[:longitude].present? ? params[:longitude] : ""
    if @tours.save
      flash[:notice] = "Tour settings updated successfully."
      redirect_to starting_point_community_tours_path(@community)
    else
      flash[:error] = @tours.errors.full_messages.join(',')
      redirect_to starting_point_community_tours_path(@community)
    end
  end
  def ajaxplotstartingpoint
    tour = Tour.find params[:tour_id]
    if tour.present?
      #unit.first.update_attributes(x_plot: params[:x_plot],y_plot: params[:y_plot],floorplate_id: params[:floorplate_id])
      tour.x_plot = params[:x_plot]
      tour.y_plot = params[:y_plot]
      tour.save(validate: false)
      render json: {tour: tour}, status: 200
    else
      render json: {}, status: 404
    end
  end
  def resetStartingPoint
    tour = Tour.find params[:id]

    @community = Community.find params[:community_id]
    if tour.present?
      #unit.first.update_attributes(x_plot: params[:x_plot],y_plot: params[:y_plot],floorplate_id: params[:floorplate_id])
      tour.x_plot = 0
      tour.y_plot = 0
      tour.save(validate: false)
      redirect_to starting_point_community_tours_path(@community)
    end
  end
  def select_stops
    @community = Community.find params[:community_id]
    @floorplate = @community.is_sitemap ? @community.sitemap : @community.floorplates.first
    @sitemap = @community.is_sitemap ? @community.sitemap : @community.floorplates.first
    @amenities = @community.amenities
  end
end

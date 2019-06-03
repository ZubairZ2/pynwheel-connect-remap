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
end

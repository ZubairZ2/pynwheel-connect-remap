class UnitAmenitiesController < ApplicationController
  add_breadcrumb "Home", :root_path
  before_action :authenticate_user!
  before_action :check_community
  before_action :set_community_and_unit

  def plot_amenity
    @amenity = Amenity.find (params[:amenity_id])
    @amenity.amenityable_type = "Unit"
    @amenity.amenityable_id = params[:unit_id]
    @amenity.x_plot = params[:x_plot]
    @amenity.y_plot = params[:y_plot]
    if @amenity.save(validate: false)
      render json: {amenity: @amenity}, status: 200
    else
      render json: {}, status: 404
    end
  end

  def plot_amenities
    add_breadcrumb "Units", community_units_path(current_community)
    add_breadcrumb "Plot Unit Images", plot_amenities_community_unit_amenities_path(@community,@unit)
    @sitemap = @unit
    @amenities = @community.amenities
    @floorplan = Floorplan.where(provider_floorplan_id: @unit.floorplan_id,community_id: @community.id).first
  end

  def remove_amenities_plot
    @unit.amenities.each do |amenity|
      amenity.x_plot = 0
      amenity.y_plot = 0
      amenity.amenityable_type = nil
      amenity.amenityable_id = nil
      amenity.save(validate: false)
    end
    redirect_to plot_amenities_community_unit_amenities_path(@community,@unit), notice: "All plots have been deleted successfully."
  end
  def check_community
    unless current_user.is_super_admin?
      if params[:community_id].present?
        all_ids = []
        current_user.communities.each do |c|
          # all_ids.insert(c.id)
          all_ids << c.id
        end
        # byebug
        # puts '+++++++++++++++', all_ids[0]
        if all_ids.include? params[:community_id].to_i

        else
          redirect_to root_path
        end
      end
    end
  end

  def remove_amenity
    @amenity = Amenity.find params[:id]
    amenities = @unit.amenities.where(x_plot: @amenity.x_plot, y_plot: @amenity.y_plot)
    amenities.each do |amenity|
      amenity.x_plot = 0
      amenity.y_plot = 0
      amenity.amenityable_type = nil
      amenity.amenityable_id = nil
      amenity.save(validate: false)
    end
    redirect_to plot_amenities_community_unit_amenities_path(@community,@unit), notice: "Amenity plot have been deleted successfully."
  end

  private

  def set_community_and_unit
    @community = Community.find params[:community_id]
    @unit = Unit.find params[:unit_id]
  end

  def amenity_params
    params.require(:amenity).permit!
  end
end
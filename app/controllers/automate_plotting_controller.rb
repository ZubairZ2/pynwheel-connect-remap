class AutomatePlottingController < ApplicationController
  include AssignLocksHelper

  def index
    @community = Community.find params[:community_id]
    unless @community.is_sitemap ##community is floor plate
      @floorplates = @community.floorplates.pluck(:id, :range).sort { |a, b| b[1] <=> a[1] }.reverse
      if params[:floorNo].present?
        @floorplate = Floorplate.find(JSON.parse(params[:floorNo])[0])
      else
        @floorplate = Floorplate.find(@floorplates.first[0])
      end
      @community_units = @floorplate.fetch_units.includes(:door)
      @current_locks_provider = existing_locks_provider(@community)
      @all_locks = all_locks(@community)
      @hallways = @floorplate.hallways.order("id ASC")
      @access_points = @floorplate.access_points # @floorplate.access_points.select('DISTINCT ON (x_plot, y_plot) *')
      @unit_with_door = @community_units.map { |unit| { unit_info: { unit: { id: unit.id, name: unit.name, building: unit.building, provider_id: unit.provider_unit_id, x_plot: unit.x_plot, y_plot: unit.y_plot }, door: unit.door.present? ? unit.door : {} } } }

      add_breadcrumb "Floor plates", community_floorplates_path(current_community)
      add_breadcrumb "Plot Floor Plate Units", community_floorplate_plotexp_path(current_community, @floorplate)
    end
  end
end

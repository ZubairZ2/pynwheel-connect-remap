class BuildingStartingPointsController < ApplicationController
	def edit
		@community = Community.find params[:community_id]
    @building_starting_point = BuildingStartingPoint.find_by_id(params[:id])
	end
	def update
		byebug
    respond_to do |format|
      if @building_starting_point.update(building_starting_point_params)
        ts = TourStop.find_by(stop_type: "building_starting_point", stop_id: @building_starting_point.id)
        if ts.present?
          ts.update_attributes(name: @building_starting_point.name)
        end
        format.html { redirect_back(fallback_location: community_building_starting_point_path, notice: 'building_starting_point was successfully updated.') }
        format.js { render :show, status: :ok, location: @building_starting_point }
      else
        format.html { render :edit }
        format.json { render json: @building_starting_point.errors, status: :unprocessable_entity }
      end
    end
  end


  def destroy
    ts = TourStop.find_by(stop_type: "building_starting_point", stop_id: @building_starting_point.id)
    if ts.present?
      VisitedStop.where(tour_stop_id: ts.id).destroy_all
      ts.destroy
    end
    @building_starting_point.destroy

    respond_to do |format|
      format.html { redirect_to community_building_starting_point_url, notice: 'building_starting_point was successfully destroyed.' }
      format.json { head :no_content }
    end
  end
  def building_starting_point_params
  	params.require(:building_starting_point).permit(:name, :x_plot, :y_plot, :community_id, :floor, :building)
  end

end

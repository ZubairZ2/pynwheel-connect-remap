class BuildingStartingPointsController < ApplicationController
  # include Error::ErrorHandler
  include AssignLocksHelper
  before_action :check_community
  after_filter "previous_url", only: [:edit]

	def edit
		@community = Community.find params[:community_id]
    @floors = @community.floorplates.map{|x| x.floors}.flatten!.distinct.sort rescue []
    @building_starting_point = BuildingStartingPoint.find_by_id(params[:id])
    @all_locks = all_locks(@community)
  end

  def update
    @building_starting_point = BuildingStartingPoint.find params[:id]
    respond_to do |format|
      if @building_starting_point.update(building_starting_point_params)
        update_enable_locks()
        ts = TourStop.find_by(stop_type: "building_starting_point", stop_id: @building_starting_point.id)
        if ts.present?
          ts.update_columns(name: @building_starting_point.name)
        end
        if params[:done_action] == "true"
          format.html { redirect_to( session[:go_back] , notice: "Building starting point was successfully updated.")}
          format.js { render :show, status: :ok, location: @building_starting_point }
        else
          format.html { redirect_back(fallback_location: community_building_starting_point_path, notice: 'Building starting point was successfully updated.') }
          format.js { render :show, status: :ok, location: @building_starting_point }
        end
      else
        @floors = @community.floorplates.map{|x| x.floors}.flatten!.distinct.sort rescue []
        flash[:error] = @building_starting_point.errors.full_messages.join(',')
        format.html { redirect_back(fallback_location: community_building_starting_point_path) }
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
      format.html { redirect_to community_building_starting_point_url, notice: 'Building starting point was successfully destroyed.' }
      format.json { head :no_content }
    end
  end
  def building_starting_point_params
  	params.require(:building_starting_point).permit(:name, :x_plot, :y_plot, :community_id, :floor, :building, :directional_text, :access_code, :lock_provider)
  end

  def previous_url
    session[:go_back] = request.referer if request.referer != request.url
  end

  private
  def update_enable_locks()
    if @community.enable_locks
        lock_id = (params.has_key?("lock_id") or params[:lock_id] == "") ? params[:lock_id] : nil
        assign_lock(@community, @building_starting_point, lock_id) unless lock_id.nil?
        if params[:building_starting_point][:lock_provider] == "Manual"
          @building_starting_point.update_column(:lock_provider, "") if params[:building_starting_point][:access_code] == ""
        else
          @building_starting_point.update_column(:lock_provider, "") if lock_id.nil? or params[:lock_id] == ""
        end
    end 
  end
end

class BuildingStartingPointsController < ApplicationController
  before_action :check_community
  after_filter "previous_url", only: [:edit]
	def edit
		@community = Community.find params[:community_id]
    @floors = @community.floorplates.map{|x| x.floors}.flatten!.uniq.sort rescue []
    @building_starting_point = BuildingStartingPoint.find_by_id(params[:id])
	end
  def update
    @building_starting_point = BuildingStartingPoint.find params[:id]
    if @community.enable_locks and @community.locks_provider == "Dwelo"
      if params[:dwelo_remote_lock].present?
        remote_lock = RemoteLock.find_by(device_id: params[:dwelo_remote_lock] , dwelo_id: @community.dwelo.id) rescue nil

        if @building_starting_point.remote_locks.present? and @building_starting_point.remote_locks.last.device_id != remote_lock.device_id
          @building_starting_point.remote_locks.update_all(stop_id: nil, stop_type: nil, stop_name: nil)
          remote_lock.update_attributes(stop_id: @building_starting_point.id, stop_type: "building_starting_point", stop_name: @building_starting_point.name) rescue nil
        elsif @building_starting_point.remote_locks.blank?
          remote_lock.update_attributes(stop_id: @building_starting_point.id, stop_type: "building_starting_point", stop_name: @building_starting_point.name) rescue nil
        end
      elsif params[:dwelo_remote_lock] == ""
        @building_starting_point.remote_locks.update_all(stop_id: nil, stop_type: nil, stop_name: nil)
      end
    end
    if params[:latch_lock].present? and @community.locks_provider == "Latch" 
      latch_lock = LatchLock.find_by(lock_id: params[:latch_lock], latch_id: @community.latch.id) rescue nil
      @building_starting_point.latch_locks.update_all(stop_id: nil, stop_type: nil)
      latch_lock.update_attributes(stop_id: @building_starting_point.id, stop_type: "BuildingStartingPoint")
    end
    respond_to do |format|
      if @building_starting_point.update(building_starting_point_params)
        ts = TourStop.find_by(stop_type: "building_starting_point", stop_id: @building_starting_point.id)
        if ts.present?
          ts.update_attributes(name: @building_starting_point.name)
        end
        if params[:done_action] == "true"
          format.html { redirect_to( session[:go_back] , notice: "Building starting point was successfully updated.")}
          format.js { render :show, status: :ok, location: @building_starting_point }
        else
          format.html { redirect_back(fallback_location: community_building_starting_point_path, notice: 'Building starting point was successfully updated.') }
          format.js { render :show, status: :ok, location: @building_starting_point }
        end
      else
        @floors = @community.floorplates.map{|x| x.floors}.flatten!.uniq.sort rescue []
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
  	params.require(:building_starting_point).permit(:name, :x_plot, :y_plot, :community_id, :floor, :building, :directional_text, :access_code)
  end

  def previous_url
    session[:go_back] = request.referer if request.referer != request.url
  end
end

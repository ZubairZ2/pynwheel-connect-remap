class AmenitiesController < ApplicationController
  # include Error::ErrorHandler
  include AssignLocksHelper
  before_action :authenticate_user!
  before_action :check_community
  after_action :previous_url, only: [:edit]

  add_breadcrumb "Home", :root_path

  def index
    @amenities = current_community.amenities.order(id: :desc)
    add_breadcrumb "Amenity Images", community_amenities_path(current_community)
  end

  def create
    if params[:amenityId].present?
      @amenity = Amenity.find params[:amenityId]
      @amenity.image = params[:src]
      @amenity.save
      redirect_to edit_community_amenity_path(current_community, @amenity)
    else
      AmenityImagesJob.perform_async current_community&.id, params[:src], params[:name]
      @amenities = current_community.amenities.order(id: :desc)
    end
  end

  def edit
    @community = Community.find params[:community_id]
    @amenity = Amenity.find (params[:id])
    @doors = @amenity.ordered_doors
    if params[:unit].present?
      @unit = Unit.find (params[:unit])
    end
    @from_unit =  (params[:from] == "unit" and @amenity.amenityable_type == "Unit") ?  @amenity.amenityable_id : "0"
    @floors = @amenity.building.present? ? @community.floorplates.where(building: @amenity.building).map{|x| x.floors}.flatten.sort : (@community.floorplates.map{|x| x.floors}.flatten.uniq).sort
    @current_locks_provider = existing_locks_provider(@community)
    @all_locks = all_locks(@community)
  end

  def show_amenity_image_in_modal
    @community = Community.find params[:community_id]
    @amenity = Amenity.find params[:id]
  end

  def crop_amenity_image
    @community = Community.find params["community_id"]
    @amenity = Amenity.find params["id"]
    @amenity.name = params[:amenity][:name] if params[:amenity][:name].present?
    if @amenity.crop_x == params[:amenity][:crop_x].to_f
      @amenity.do_crop = false
    else
      @amenity.do_crop = true
    end
    @amenity.crop_x = params[:amenity][:crop_x]
    @amenity.crop_y = params[:amenity][:crop_y]
    @amenity.crop_w = params[:amenity][:crop_w]
    @amenity.crop_h = params[:amenity][:crop_h]
    @amenity.save!
    if @amenity.amenityable_type == "Unit"
    redirect_to "/communities/#{@community.id}/amenities/#{@amenity.id}/edit?from=unit&unit=#{@amenity.amenityable_id}", notice: "Amenity updated successfully"
    else
      redirect_to edit_community_amenity_path(@community, @amenity)
    end


  end

  def update
    @amenity = Amenity.find(params[:id]) 
    if @amenity.update(amenity_params)
      update_locks()
      TourStop.where(stop_id: @amenity.id).update_all(name: params[:amenity][:name]) if params[:amenity][:name].present?
      if params[:unit].present? && params[:unit_render].present? && params[:unit_render] != "false"
        @unit = Unit.find(params[:unit]) rescue nil
        if @unit.present?
          redirect_to "/communities/#{@community.id}/amenities/#{@amenity.id}/edit?from=unit&unit=#{params[:unit]}", notice: "Amenity updated successfully"
        end
      else
      if params[:done_action].present?
        redirect_to session[:go_back] , notice: "Amenity updated successfully"
      else
        unless params[:amenity_modal].present?
          @unit = Unit.find(params[:unit]) if params[:unit].present?
          redirect_to (params[:floorNo].nil? and params[:from].nil?) ? edit_community_amenity_path(current_community,@amenity) : ( params[:floorNo].present? ? edit_community_amenity_path(:id=>@amenity.id,:community_id=>@community.id) <<  "?floorNo=#{params[:floorNo]}" : edit_community_amenity_path(:id=>@amenity.id,:community_id=>@community.id) <<  '?from=unit'+ (@unit.present? ? '?&unit='+@unit.id.to_s : '')) , notice: "Amenity updated successfully"
        else
          redirect_to community_amenities_path(current_community), notice: "Amenity updated successfully"
        end
      end
      end
    else
      unless @amenity.image.present?
        flash[:error] = @amenity.errors.full_messages.join(',')
        redirect_to edit_community_amenity_path(current_community,@amenity)
      else
        unless params[:amenity_modal].present?
          @unit = Unit.find(params[:unit]) if params[:unit].present?
          redirect_to (params[:floorNo].nil? and params[:from].nil?) ? edit_community_amenity_path(current_community,@amenity) : ( params[:floorNo].present? ? edit_community_amenity_path(:id=>@amenity.id,:community_id=>@community.id) <<  "?floorNo=#{params[:floorNo]}" : edit_community_amenity_path(:id=>@amenity.id,:community_id=>@community.id) <<  '?from=unit'+ (@unit.present? ? '?&unit='+@unit.id.to_s : '')) , notice: "Amenity updated successfully"
        else
          redirect_to community_amenities_path(current_community), notice: "Amenity updated successfully"
        end
      end
    end
  end

  def saveAmenityGallery
    @community = Community.find params[:community_id]
    @amenity = Amenity.find params[:amenityId]
    amenity_gallery_image = AmenityGallery.create(name: params[:name],image: params[:src], amenity_id: @amenity.id)
    save_floorplan_galleries(@amenity, @community, amenity_gallery_image) if params[:type] == "floorplan"
  end

  def edit_amenity_gallery_image
    @community = current_community
    @amenity = Amenity.find params[:community_id]
    @amenity_gallery_image = AmenityGallery.find (params[:format])
  end

  def destroy
    @amenity = current_community.amenities.find (params[:id])
    ts = TourStop.where(stop_id: @amenity.id)

    if ts.present?
      VisitedStop.where(tour_stop_id: ts.pluck(:id) ).destroy_all
      ts.destroy_all
    end
    
    if @amenity.destroy
      redirect_to community_amenities_path(current_community), notice: "Amenity deleted successfully"
    else
      redirect_to community_amenities_path(current_community), error: @amenity.errors.full_messages.join(',')
    end
  end

  def update_amenity_door_lock
    @amenity = @community.amenities.find_by(id: params[:id])
    @door = @amenity.ordered_doors.find_by(id: params[:door_id])

    if get_lock_provider() == "Manual" && params[:access_code] == ""
      @door.update_columns(lock_provider: "", access_code: "")
      @amenity.update(lock_provider: "", access_code: "")
    else
      @door.update_columns(lock_provider: get_lock_provider(), access_code: params[:access_code])
      @amenity.update(lock_provider: get_lock_provider(), access_code: params[:access_code])
    end

    assign_lock_to_door(@community, @door, params[:lock_id]) if params.has_key?("lock_id") && get_lock_provider() != "Manual"
  end

  def remove_amenity_door_plot
    @amenity = @community.amenities.find_by(id: params[:id])
    @door = @amenity.ordered_doors.find_by(id: params[:door_id])
    @door.destroy
    redirect_to plot_amenities_community_floorplate_amenities_path(@community, @amenity) + "?floor=" + params["floor"]
    # render json: {amenity: @amenity, door: @door, success: true}
    # @door.destroy

  rescue
    render json: {unit: {}, door: {}, success: false}
  end

  def return_door_lock
    door = Door.where(id: params[:door_id]).includes(:dwelo_lock, :edgestate_lock, :latch_lock, :zerv_lock, :igloohome_lock).first
    digital_lock = { edgestate_lock: door.edgestate_lock, dwelo_lock: door.dwelo_lock, latch_lock: door.latch_lock, zerv_lock: door.zerv_lock, igloohome_lock: door.igloohome_lock }
    render json: {lock_provider: door.lock_provider, access_code: door.access_code, digital_lock: digital_lock}
  end

  def previous_url
    session[:go_back] = request.referer if request.referer != request.url
  end

  private

  def save_floorplan_galleries amenity, community, amenity_gallery_image
    return unless amenity.amenityable_id.present?
    floorplan = Floorplan.find_by(id: amenity.amenityable_id) if amenity.amenityable_type = "Floorplan"
    FloorplanAmenityGalleryJob.perform_async(floorplan&.id, amenity&.id, community&.id, amenity_gallery_image&.id, params)
    # FloorplanAmenitiesService.new(floorplan, amenity, community).create_floorplan_amenity_galleries(amenity_gallery_image&.id, params)
  end

  def amenity_params
    params.require(:amenity).permit!
  end

  def update_locks
    if @community.enable_locks
      if @amenity.ordered_doors.present?
        @door = @amenity.ordered_doors.find_by id: params[:door_id]
        
        if get_lock_provider() == "Manual" && params[:access_code] == ""
          @door.update_columns(lock_provider: "", access_code: "", updated_at: Time.now.utc)
          @amenity.update(lock_provider: "", access_code: "")
        else
          @door.update_columns(lock_provider: get_lock_provider(), access_code: params[:access_code], updated_at: Time.now.utc)
          @amenity.update(lock_provider: get_lock_provider(), access_code: params[:access_code])
        end

        assign_lock_to_door(@community, @door, params[:lock_id]) if params.has_key?("lock_id") && get_lock_provider() != "Manual"
      else
        @amenity.update(lock_provider: get_lock_provider(), access_code: params[:access_code])
        assign_lock(@community, @amenity, params[:lock_id]) if params.has_key?("lock_id") && get_lock_provider() != "Manual"
      end
    end
  end

  def get_lock_provider
    params[:lock_provider] || params[:amenity][:lock_provider]
  end

end

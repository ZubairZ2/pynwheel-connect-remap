class AmenitiesController < ApplicationController
  before_action :authenticate_user!
  before_action :check_community
  add_breadcrumb "Home", :root_path
  skip_before_action :load_tour_users_chats, only: [:load_remotelock_data, :clear_locks]
  def index
    @amenities = current_community.amenities.order(id: :desc)
    add_breadcrumb "Amenity Images", community_amenities_path(current_community)
  end

  def create
    if params[:amenityId].present?
      @amenity = Amenity.find params[:amenityId]
      @amenity.image = params[:src]
      @amenity.save
      redirect_to edit_community_amenity_path(current_community,@amenity)
    else
      current_community.amenities.create(image: params[:src],name: params[:name])
      @amenities = current_community.amenities.order(id: :desc)
    end
  end

  def edit
    @community = Community.find params[:community_id]
    @amenity = Amenity.find (params[:id])
    if params[:unit].present?
      @unit = Unit.find (params[:unit])
    end
    @from_unit =  (params[:from] == "unit" and @amenity.amenityable_type == "Unit") ?  @amenity.amenityable_id : "0"
    @assigned_lock = @amenity.remote_locks.first
  end

  def load_remotelock_data
    access_token = generate_remotelock_token
    responce = RemoteLockService.new(current_community).get_all_deivces(access_token)
    RemoteLockService.new(current_community).update_deivces_in_db(responce)
    es = EdgeState.find_by(community_id: current_community.id)
    if es.nil?
      render json: {locks: []}
    else
      render json: {locks: RemoteLock.where(edge_state_id: es.id)}
    end
  end
  
  def clear_locks
    amenity = Amenity.find params[:id]
    amenity.remote_locks.delete_all
    render json: {locks: amenity.remote_locks}
  end

  def update
    @amenity = Amenity.find(params[:id])
    if params[:remote_lock].present?
      remote_lock = RemoteLock.find_by(device_id: params[:remote_lock])
      remote_lock.update_attributes(stop_id: @amenity.id, stop_type: "amenity", stop_name: params[:amenity][:name])
    end
    if @amenity.update_attributes(amenity_params)
      begin
        ts = TourStop.find_by(stop_id: @amenity.id)
        if ts.present? && params[:amenity][:name].present?
          ts.name = params[:amenity][:name]
          ts.save
        end
      rescue => ex
      end
      if params[:unit].present? && params[:unit_render].present? && params[:unit_render] != "false"
        redirect_to edit_community_unit_path(current_community,params[:unit]) , notice: "Unit's Amenity updated successfully"
      else
      if params[:done_action].present?
        from_unit = params[:from_id]
        done_action = (params[:floorNo].nil? and params[:from].nil?) ? community_tours_path(current_community) : ( params[:floorNo].present? ? community_tours_path(current_community) << '?floorNo=' + params[:floorNo] : edit_community_unit_path(current_community,from_unit) )
        redirect_to done_action , notice: "Unit's Amenity updated successfully"
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
      unless params[:amenity_modal].present?
        redirect_to params[:floorNo].nil? ? edit_community_amenity_path(current_community,@amenity) : edit_community_amenity_path(current_community,@amenity) << '?floorNo=' + params[:floorNo] , alert: @amenity.errors.full_messages.join(',')
      else
        redirect_to community_amenities_path(current_community), alert: @amenity.errors.full_messages.join(',')
      end
    end
  end
  def saveAmenityGallery
    @community = Community.find params[:community_id]
    @amenity = Amenity.find params[:amenityId]
    AmenityGallery.create(name: params[:name],image: params[:src], amenity_id: @amenity.id)
  end
  def edit_amenity_gallery_image
    @community = current_community
    @amenity = Amenity.find params[:community_id]
    @amenity_gallery_image = AmenityGallery.find (params[:format])
  end

  def destroy
    @amenity = current_community.amenities.find (params[:id])
    ts = TourStop.find_by(stop_id: @amenity.id)
    if ts.present?
      VisitedStop.where(tour_stop_id: ts.id).destroy_all
      ts.destroy
    end
    if @amenity.destroy
      redirect_to community_amenities_path(current_community), notice: "Amenity deleted successfully"
    else
      redirect_to community_amenities_path(current_community), error: @amenity.errors.full_messages.join(',')
    end
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
  private

  def amenity_params
    params.require(:amenity).permit!
  end

end
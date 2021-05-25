class AmenitiesController < ApplicationController
  # include Error::ErrorHandler
  include AssignLocksHelper
  before_action :authenticate_user!
  before_action :check_community
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
    @floors = @amenity.building.present? ? @community.floorplates.where(building: @amenity.building).map{|x| x.floors}.flatten.sort : (@community.floorplates.map{|x| x.floors}.flatten.uniq).sort
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
    if @amenity.update_attributes(amenity_params)
      update_enable_locks()
      begin
        ts = TourStop.find_by(stop_id: @amenity.id)
        if ts.present? && params[:amenity][:name].present?
          ts.name = params[:amenity][:name]
          ts.save
        end
      rescue => ex
      end
      if params[:unit].present? && params[:unit_render].present? && params[:unit_render] != "false"
          @unit = Unit.find(params[:unit]) rescue nil
          if @unit.present?
            redirect_to "/communities/#{@community.id}/amenities/#{@amenity.id}/edit?from=unit&unit=#{params[:unit]}", notice: "Amenity updated successfully"
          end
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
        @unit = Unit.find(params[:unit]) if params[:unit].present?
        redirect_to (params[:floorNo].nil? and params[:from].nil?) ? edit_community_amenity_path(current_community,@amenity) : ( params[:floorNo].present? ? edit_community_amenity_path(:id=>@amenity.id,:community_id=>@community.id) <<  "?floorNo=#{params[:floorNo]}" : edit_community_amenity_path(:id=>@amenity.id,:community_id=>@community.id) <<  '?from=unit'+ (@unit.present? ? '?&unit='+@unit.id.to_s : '')) , notice: "Amenity updated successfully"
      else
        redirect_to community_amenities_path(current_community), notice: "Amenity updated successfully"
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
  private

  def amenity_params
    params.require(:amenity).permit!
  end

  def update_enable_locks()
    if @community.enable_locks
        lock_id = (params.has_key?("lock_id") or params[:lock_id] == "") ? params[:lock_id] : nil
        assign_lock(@community, @amenity, lock_id) unless lock_id.nil?
        if params[:amenity][:lock_provider] == "Manual"
          @amenity.update_column(:lock_provider, "") if params[:amenity][:access_code] == ""
        else
          @amenity.update_column(:lock_provider, "") if lock_id.nil? or params[:lock_id] == ""
        end
      end 
  end

end

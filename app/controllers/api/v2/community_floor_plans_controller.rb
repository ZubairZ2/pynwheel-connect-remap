class Api::V2::CommunityFloorPlansController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :load_community, only: [:index, :add_floorplan, :destroy, :delete_floorplan_amenity, :delete_floorplan_image]
  before_action :load_floorplan, only: [:destroy, :delete_floorplan_amenity, :delete_floorplan_image]

  def index
    floorplans = @community.floorplans.order(created_at: :desc)
    if floorplans.present?
      render json: { success: true, data: floorplans.as_json }
    else
      render json: { success: false, data: "No floorplans found" }
    end
  end

  def add_floorplan
    begin
      floorplans_params = params["floorplan"]
      @status = params["status"]
      if floorplans_params.present?
        floorplans_params.values.each do |floorplan|
          floorplan_id = floorplan["id"]
          if floorplan_id.present?
            @floorplan = @community.floorplans.find_by_id(floorplan_id)
            if @floorplan.present?
              update_floorplan(floorplan)
            end
          else
            create_floorplan(floorplan)
          end
        end
      end
      
      @community.submit_launch_form(FLOORPLAN_IMAGES, current_pynwheel_user, @status)
      floorplans = @community.floorplans.order(created_at: :desc)
      render json: { success: true, message: "floorplan has been updated successfully.", data: floorplans.as_json }
    rescue => ex
      render json: { success: false, error_code: 400, message: "#{ex.message}, please verify and try again." }, status: 400
    end
  end

  def delete_floorplan_image
    if @load_floorplan.present?
      if @load_floorplan.image.present?
        @load_floorplan.remove_image!
        @load_floorplan.standard_image_url = nil
      else
        @load_floorplan.remove_file!
      end
      if @load_floorplan.save
        @community.set_floorplan_status(current_pynwheel_user, "in_progress")
        render :json => {:success => true, :error_code => 200, :message => "Floorplan images deleted successfully", data: nil}
      else
        render :json => {:success => false, :error_code => 500, :message => @load_floorplan.errors.full_messages}
      end
    else
      render :json => {:success => false, :error_code => 400, :message => "Floorplan not found"}
    end
  end

  def delete_floorplan_amenity
    if @load_floorplan.present?
      @amenity = @load_floorplan.amenities.find_by(id: params[:amenity_id])
      if @amenity.destroy
        FloorPlans::UnitsService.new(@load_floorplan.id).delete_floorplan_units_image( params[:amenity_id] )
        @community.set_floorplan_status(current_pynwheel_user, "in_progress")
        render :json => {:success => true, :error_code => 200, :message => "Floorplan amenity deleted successfully", data: nil}
      else
        render :json => {:success => false, :error_code => 500, :message => @load_floorplan.errors.full_messages}
      end
    else
      render :json => {:success => false, :error_code => 400, :message => "Floorplan not found"}
    end
  end

  def destroy
    if @load_floorplan.present?
      if @load_floorplan.destroy!
        @community.set_floorplan_status(current_pynwheel_user, "in_progress")
        floorplans = @community.floorplans.order(created_at: :desc)
        render :json => {:success => true, :error_code => 200, data: floorplans.as_json, :message => "Floorplan deleted successfully"}
      else
        render :json => {:success => false, :error_code => 500, :message => @load_floorplan.errors.full_messages}
      end
    else
      render :json => {:success => false, :error_code => 400, :message => "Floorplan not found"}
    end
  end

  private

  def update_floorplan(floorplan)
    if floorplan["image"].present?
      @floorplan.remove_file!
       @floorplan.update(name: floorplan["name"], description: floorplan["description"], virtual_tour_url: floorplan["virtualTourUrl"], image: floorplan["image"])
    elsif floorplan["file"].present?
      @floorplan.remove_image!
       @floorplan.update(name: floorplan["name"], description: floorplan["description"], virtual_tour_url: floorplan["virtualTourUrl"], file: floorplan["file"])
    else
      @floorplan.update(name: floorplan["name"], description: floorplan["description"], virtual_tour_url: floorplan["virtualTourUrl"])
    end

    if floorplan["aminities"].present?
      floorplan["aminities"].values.each do |amenity|
        if !amenity[:id].present?
          image_filter_down_to_units(amenity)
        end
      end
    end

  end

  def create_floorplan(floorplan)
    @floorplan = @community.floorplans.new(name: floorplan["name"])
    @floorplan.image = floorplan[:image] if floorplan[:image].present?
    @floorplan.file = floorplan[:file] if floorplan[:file].present?
    if @floorplan.save
      if floorplan["aminities"].present?
        floorplan["aminities"].values.each do |amenity|
          image_filter_down_to_units(amenity)
        end
      end
    end
  end

  def image_filter_down_to_units amenity_params
    amenity = @floorplan.amenities.create(image:  amenity_params["image"], name: amenity_params["image"].original_filename )
    amenity.update!(floorplan_amenity_id: amenity.id)
    FloorPlans::UnitsService.new(@floorplan.id).create_floorplan_units_image(amenity_params["image"], amenity.name, amenity.id)
  end

  def load_floorplan
    @load_floorplan = @community.floorplans.find_by(id: params[:id])
    rescue ActiveRecord::RecordNotFound
    render json: {success: false, error_code: 400, message: 'Floorplan not found', data: nil}, status: :not_found
  end

  def load_community
    @community = Community.find params[:community_id]
    rescue ActiveRecord::RecordNotFound
      render json: {success: false, error_code: 400, message: 'Community not found', data: nil}, status: :not_found
  end
end

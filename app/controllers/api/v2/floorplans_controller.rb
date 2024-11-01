class Api::V2::FloorplansController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :load_community
  before_action :load_floorplan, only: [:update_floorplan_media, :remove_floorplan_media, :destroy]
  after_action :update_floorplan_form_status_to_inprogress, except: [:index, :save_floorplans_form]

  def index
    floorplans = @community.floorplans.order(created_at: :desc)
    render json: { success: true, data: floorplans.as_json }
  end

  # Before there's no option on launch to add new floorplan
  def create

  end

  def update_floorplan_media    
    if @floorplan.update!(image: params[:file])
      render json: {success: true, message: "Floorplan media updated successfully", data: @floorplan.as_json}
    else
      render json: {success: false, message: "Failed to update media", data: nil}
    end
  end

  def remove_floorplan_media
    begin
      @floorplan.remove_image!
      @floorplan.standard_image_url = nil
      @floorplan.save

      render json: {success: true, message: "Floorplan media removed successfully"}
  
    rescue => exception
      render json: {success: false, message: exception.message}
    end
  end

  def save_floorplans_form
    begin
      params[:floorplans]&.each do |floorplan_param|
        floorplan = @community.floorplans.find floorplan_param[:id]
        floorplan.update_columns(name: floorplan_param[:name], virtual_tour_url: floorplan_param[:virtual_tour_url], description: floorplan_param[:description]) if floorplan.present?
        update_floorplan_amenities_info(floorplan, floorplan_param[:amenities])
      end

      @community.update_floorplans_form_status(current_pynwheel_user,  params["status"])

      render json: {success: true, message: "Floorplan form saved successfully"}
    
    rescue => exception
      render json: {success: false, message: exception.message}
    end
  end


  def destroy
    if @floorplan.destroy!
      render json: {success: true, message: "Floorplan deleted successfully"}
    else
      render json: {success: false, message: "Failed to delete floorplan"}
    end
  end

  private

    def update_floorplan_amenities_info floorplan, floorplan_amenities
      floorplan_amenities&.each do |floorplan_amenity_param|
        if floorplan.present?
          floorplan_amenity = floorplan.amenities.find floorplan_amenity_param[:id]
          floorplan_amenity.update_columns(name: floorplan_amenity_param[:name], description: floorplan_amenity_param[:description])
          FloorplanAmenitiesService.new(floorplan, floorplan_amenity, @community).update_description_and_name()
        end
      end
    end

    def update_floorplan_form_status_to_inprogress
      @community.set_floorplan_status(current_pynwheel_user, "in_progress")
    end

    def load_floorplan
      @floorplan = @community.floorplans.find params[:id]
      
      rescue ActiveRecord::RecordNotFound
        render json: {success: false, error_code: 400, message: 'Floorplan not found', data: nil}, status: :not_found
    end

    def load_community
      @community = Community.find params[:community_id]
      rescue ActiveRecord::RecordNotFound
        render json: {success: false, error_code: 400, message: 'Community not found', data: nil}, status: :not_found
    end

end
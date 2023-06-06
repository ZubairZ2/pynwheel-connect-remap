class Api::V2::FloorplanAmenitiesController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :load_community
  before_action :load_floorplan
  before_action :load_floorplan_amenity, only: [:destroy]
  after_action :update_floorplan_form_status_to_inprogress

  def create
    begin
      amenity = @floorplan.amenities.create(image:  params[:file], name: params[:file].original_filename )    
      amenity.update!(floorplan_amenity_id: amenity.id)
      FloorplanAmenityImagesJob.perform_async @floorplan, params[:file], amenity.name, amenity, @community.id
    
      render json: {success: true, message: "Floorplan amenity media created successfully",  data: amenity.as_json}
  
    rescue => exception
      render json: {success: false, message: exception.message}
    end
  end

  def destroy
    begin
      if @floorplan_amenity.destroy
        DeleteFloorplanAmenityImagesJob.perform_async @floorplan, params[:id], @community.id
        render json: {success: true, message: "Floorplan amenity media removed successfully"}
      else
        render json: {success: false, message: "Something went wrong!"}
      end
    rescue => exception
      render json: {success: false, message: exception.message}
    end
  end


  private
    def update_floorplan_form_status_to_inprogress
      @community.set_floorplan_status(current_pynwheel_user, "in_progress")
    end

    def load_floorplan_amenity
      @floorplan_amenity = @floorplan.amenities.find params[:id]
      
      rescue ActiveRecord::RecordNotFound
        render json: {success: false, error_code: 400, message: 'Floorplan amenity not found', data: nil}, status: :not_found
    end

    def load_floorplan
      @floorplan = @community.floorplans.find params[:floorplan_id]
      
      rescue ActiveRecord::RecordNotFound
        render json: {success: false, error_code: 400, message: 'Floorplan not found', data: nil}, status: :not_found
    end

    def load_community
      @community = Community.find params[:community_id]
      rescue ActiveRecord::RecordNotFound
        render json: {success: false, error_code: 400, message: 'Community not found', data: nil}, status: :not_found
    end
end
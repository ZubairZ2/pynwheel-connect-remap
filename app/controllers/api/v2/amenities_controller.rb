class Api::V2::AmenitiesController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :load_community
  before_action :load_amenity, only: [:destroy]


  def index
    render json: {success: true, data:  @community&.amenities.as_json, code: 200}
  end

  def add_amenities

  end

  def destroy
    if @amenity.destroy!
      @community.set_community_amenity_status(current_pynwheel_user, "in_progress")
      render json: {success: true, message: "Amenity deleted successfully", data: @community&.amenities.as_json}
    else
      render json: {success: false, message: "Failed to delete amenity", data: nil}
    end
  end


  private

    def load_amenity
      @amenity = Amenity.find params[:id]
      
      rescue ActiveRecord::RecordNotFound
        render json: {success: false, error_code: 400, message: 'Amenity not found', data: nil}, status: :not_found
    end

    def load_community
      @community = Community.find params[:community_id]
      rescue ActiveRecord::RecordNotFound
        render json: {success: false, error_code: 400, message: 'Community not found', data: nil}, status: :not_found
    end

    def amenity_params
      params.require(:amenity).permit(:id, :name, :image)
    end
end
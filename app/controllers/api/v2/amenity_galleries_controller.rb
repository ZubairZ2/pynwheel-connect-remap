class Api::V2::AmenityGalleriesController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :load_community
  before_action :load_amenity
  before_action :load_amenity_gallery, only: [:destroy]
  after_action :update_amenity_form_status

  def create
    amenity_gallery =  @amenity.amenity_galleries.new(image: params[:file], name: params[:file].original_filename)

    if amenity_gallery.save!
      render json: {success: true, message: "Amenity gallery added successfully", data: amenity_gallery.as_json}
    else
      render json: {success: false, message: "Failed to add amenity gallery", data: nil}
    end
  end

  def destroy
    if @amenity_gallery.destroy!
      render json: {success: true, message: "Amenity gallery deleted successfully"}
    else
      render json: {success: false, message: "Failed to delete amenity gallery"}
    end
  end

  private

    def update_amenity_form_status
      @community.set_community_amenity_status(current_pynwheel_user, "in_progress")
    end
  
    def load_amenity_gallery
      @amenity_gallery = @amenity.amenity_galleries.find params[:id]

      rescue ActiveRecord::RecordNotFound
        render json: {success: false, error_code: 400, message: 'Amenity Gallery not found', data: nil}, status: :not_found
    end
      
    def load_amenity
      @amenity = @community.amenities.find params[:amenity_id]
      
      rescue ActiveRecord::RecordNotFound
        render json: {success: false, error_code: 400, message: 'Amenity not found', data: nil}, status: :not_found
    end

    def load_community
      @community = Community.find params[:community_id]
      rescue ActiveRecord::RecordNotFound
        render json: {success: false, error_code: 400, message: 'Community not found', data: nil}, status: :not_found
    end
end
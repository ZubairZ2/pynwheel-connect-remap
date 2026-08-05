class Api::V2::AmenitiesController < Api::V2::ApiApplicationController

  before_action :doorkeeper_authorize!
  before_action :load_community
  before_action :load_amenity, only: [:update_amenity_media, :remove_amenity_media, :destroy]
  after_action :update_amenity_form_status, except: [:index, :save_amenity_form]

  def index
    render json: {success: true, data:  @community&.amenities.as_json, code: 200}
  end

  def create
    begin
      @amenity = @community.amenities.create!(name: params[:name], amenity_type: params[:amenity_type], video_link: params[:video_link], image: params[:file])
      render json: {success: true, message: "Amenity added successfully", data: @amenity.as_json}
    rescue => exception
      render json: {success: false, message: exception.message}
    end
  end

  def update_amenity_media
    if @amenity.update!(image: params[:file])
      render json: {success: true, message: "Amenity media updated successfully", data: @amenity.as_json}
    else
      render json: {success: false, message: "Failed to update media", data: nil}
    end
  end

  def remove_amenity_media
    begin
      @amenity.remove_image!
      @amenity.standard_image_url = nil
      @amenity.save

      render json: {success: true, message: "Amenity media removed successfully"}
  
    rescue => exception
      render json: {success: false, message: exception.message}
    end
  end

  def save_amenity_form
    begin
      params[:amenities]&.each do |amenity_param|
        amenity = @community.amenities.find amenity_param[:id]
        amenity.update(name: amenity_param[:name], amenity_type: amenity_param[:amenity_type], video_link: amenity_param[:video_link], description: amenity_param[:description]) if amenity.present?
        update_amenity_galleries_info(amenity, amenity_param[:amenity_galleries])
      end

      update_amenities_form_status()

      render json: {success: true, message: "Amenity form saved successfully"}
    
    rescue => exception
      render json: {success: false, message: exception.message}
    end
  end

  def destroy
    if @amenity.destroy!
      render json: {success: true, message: "Amenity deleted successfully"}
    else
      render json: {success: false, message: "Failed to delete amenity"}
    end
  end

  private

    def update_amenity_galleries_info amenity, amenity_galleries
      amenity_galleries&.each do |amenity_gallery_param|
        if amenity.present?
          amenity_gallery = amenity.amenity_galleries.find amenity_gallery_param[:id]
          amenity_gallery.update(name: amenity_gallery_param[:name], description: amenity_gallery_param[:description])
        end
      end
    end

    def update_amenity_form_status
      @community.set_community_amenity_status(current_pynwheel_user, "in_progress")
    end

    def update_amenities_form_status
      @community.submit_launch_form(AMENITY_IMAGES, current_pynwheel_user, params["status"])
    end

    def load_amenity
      @amenity = @community.amenities.find params[:id]
      
      rescue ActiveRecord::RecordNotFound
        render json: {success: false, error_code: 400, message: 'Amenity not found', data: nil}, status: :not_found
    end

    def load_community
      @community = Community.find params[:community_id]
      rescue ActiveRecord::RecordNotFound
        render json: {success: false, error_code: 400, message: 'Community not found', data: nil}, status: :not_found
    end
end

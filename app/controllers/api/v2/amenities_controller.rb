class Api::V2::AmenitiesController < Api::V2::ApiApplicationController

  before_action :doorkeeper_authorize!
  before_action :load_community
  before_action :load_amenity, only: [:destroy]

  def index
    render json: {success: true, data:  @community&.amenities.as_json, code: 200}
  end

  def add_or_update_amenities
    begin

      create_or_update_amenities()
      update_amenities_form_status()

      render json: {success: true, data: @community.amenities.as_json}

    rescue => error
      render json: {success: false, error: error.message}
    end
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
  
    def create_or_update_amenities
      amenity_params.values.each do |amenity|
        if amenity["id"].present?
          update_community_amenity(amenity)
        else
          create_community_amenity(amenity)
        end
      end
    end

    def update_community_amenity(amenity)
      update_amenity = Amenity.find(amenity["id"])

      if update_amenity.present?
        if amenity["image"].present?
          update_amenity.update_attributes(name: amenity["name"], image: amenity["image"])
        else
          update_amenity.update(name: amenity["name"])
        end
      end
    end

    def create_community_amenity(amenity)
      @community.amenities.create!(name: amenity["name"], image: amenity["image"])
    end

    def update_amenities_form_status
      previous_status = PynwheelLaunch::Communities::CommunityDetailForms.new(@community).check_status_of_specific_form(AMENITY_IMAGES)
      @community.set_community_amenity_status(current_pynwheel_user,  params["status"])
      FollowUpMailer.send_email_after_form_submission(@community, AMENITY_IMAGES, previous_status)
    end

    def amenity_params
      params["amenity"]
    end

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

class Api::V2::CommunityAmenityController < Api::V2::ApiApplicationController

  before_action :doorkeeper_authorize!
  before_action :load_community
  before_action :load_amenity, only: [:destroy]

  def index
    if @community.present?
      amenities = @community&.amenities
      if amenities.present?
        render json: {success: true, data: amenities.as_json, code: 200}
      else
        render json: {success: false, data: nil, message: "Amenities not found for this community"}
      end
    else
      render json: {success: false, data: nil, message: "Community not found."}
    end
  end

  def add_community_amenity
    begin
      amenity_params = params["amenity"]
      @status = params["status"] || ""
      amenity_params.values.each do |amenity|
        if amenity["id"].present?
          update_community_amenity(amenity)
        else
          create_community_amenity(amenity)
        end
      end
      amenities = @community.amenities
      previous_status = PynwheelLaunch::Communities::CommunityDetailForms.new(@community).check_status_of_specific_form(AMENITY_IMAGES)
      @community.set_community_amenity_status(current_pynwheel_user, @status)
      FollowUpMailer.send_email_after_form_submission(@community, AMENITY_IMAGES, previous_status)
      if amenities.present?
        render json: {success: true, data: amenities.as_json}
      end
    rescue => error
      render json: {success: false, error: error}
    end
  end

  def destroy
    if @amenity.present?
      if @amenity.destroy!
        amenities = @community.amenities
        @community.set_community_amenity_status(current_pynwheel_user, "in_progress")
        render json: {success: true, message: "Amenity deleted successfully", data: amenities.as_json}
      end
    else
      render json: {success: false, message: "Failed to delete amenity", data: nil}
    end
  end

  private

  def check_previous_status

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
    if @community.present?
      @community.amenities.create!(name: amenity["name"], image: amenity["image"])
    end
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

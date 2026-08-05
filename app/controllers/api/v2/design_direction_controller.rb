class Api::V2::DesignDirectionController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :load_community
  before_action :load_design_direction, only: [:update]
  before_action :load_design_direction_image, only: [:delete_design_image]


  def index
    if @community.present?
      design_direction = @community&.design_direction || @community&.create_design_direction
      if design_direction.present?
        render json: { success: true, data: design_direction.as_json, code: 200 }
      else
        render json: { success: false, data: nil, message: "Amenities not found for this community" }
      end
    else
      render json: { success: false, data: nil, message: "Community not found." }
    end
  end

  def update
    if @design_direction.present?
      design_params= params["design_direction"]
      @status = params["status"] || ""
      if design_params["image"].present?
        @design_direction.remove_file!
        updated = @design_direction.update(image: design_params["image"],hex_colors: design_params["hex_colors"], direction: design_params["direction"], additional_direction: design_params["additional_direction"])
      elsif design_params["file"].present?
        @design_direction.remove_image!
        updated = @design_direction.update(file: design_params["file"],hex_colors: design_params["hex_colors"], direction: design_params["direction"], additional_direction: design_params["additional_direction"])
      else
        updated = @design_direction.update(hex_colors: design_params["hex_colors"], direction: design_params["direction"], additional_direction: design_params["additional_direction"])
      end
      if updated
        @community.submit_launch_form(DESIGN_DIRECTION, current_pynwheel_user, @status)
        render json: { success: true, data: @design_direction.as_json, message: "Design direction updated successfully!" }
      else
        render json: { success: true, data: nil, message: "Failed to update design direction!" }
      end
    end
  end

  def delete_design_image
    if @design_direction_image.present?
      image_type = params["get_design_type"]
      if image_type.present?
        @design_direction_image.remove_image! if image_type.eql?("image")
        @design_direction_image.remove_file! if image_type.eql?("file")
        if @design_direction_image.save
          @community.set_design_direction_status(current_pynwheel_user, "in_progress")
          render json: { success: true, message: "Design Direction image deleted successfully!", data: @design_direction_image.as_json }
        else
          render json: { success: false, message: "Failed to delete design direction image!", data: nil }
        end
      else
        render json: { success: false, message: "Design Direction image not found!", data: nil }
      end
    end
  end

  private

  def load_design_direction_image
    @design_direction_image = DesignDirection.find params[:design_direction_id]
    rescue ActiveRecord::RecordNotFound
      render json: { success: false, error_code: 400, message: 'Community not found', data: nil }, status: :not_found
  end

  def load_design_direction
    @design_direction = DesignDirection.find params[:id]
    rescue ActiveRecord::RecordNotFound
      render json: { success: false, error_code: 400, message: 'Community not found', data: nil }, status: :not_found
  end

  def load_community
    @community = Community.find params[:community_id]
  rescue ActiveRecord::RecordNotFound
    render json: { success: false, error_code: 400, message: 'Community not found', data: nil }, status: :not_found
  end
end

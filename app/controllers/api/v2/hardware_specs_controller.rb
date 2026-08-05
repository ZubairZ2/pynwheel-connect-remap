class Api::V2::HardwareSpecsController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :set_community

  def get_pynwheel_touch_hardware_spec
    hardware_spec = @community.hardware_spec
    if hardware_spec.present?
      render json: {success: true, data: hardware_spec.as_json}
    else
      render json: {success: false, message: "Hardware image not found"}
    end
  end

  def add_pynwheel_touch_hardware_spec
    hardware = params[:hardware]
    @status = params["status"]
    if hardware.present?
      hardware_spec = ""
      if hardware["id"].present?
        hardware_spec = HardwareSpec.find hardware["id"]
        # hardware_spec.update(name: hardware["name"], phone: hardware["phone"], image: hardware["image"])
        hardware_spec.name = hardware["name"]
        hardware_spec.phone = hardware["phone"]
        hardware_spec.image = hardware["image"]
        hardware_spec.save(validate: false)
      else
        hardware_spec = @community.create_hardware_spec(name: hardware["name"], phone: hardware["phone"], image: hardware["image"])
      end
      @community.submit_launch_form(HARDWARE_SPECS, current_pynwheel_user, @status)
      render :json => {success: true, data: hardware_spec.as_json}
    else
      render json: {success: false, message: "Unable to add hardsware spec image"}
    end
  end

  def delete_hardware_spec_details
    hardware = @community.hardware_spec
    if hardware.present?
      if hardware.present?
        if hardware.destroy!
          render json: {success: true, message: "Hardware installation details deleted successfully"}
        else
          render json: {success: false, message: "Failed to delete hardware installation details"}
        end
      end
    end
  end

  def delete_pynwheel_touch_hardware_spec_image
    hardware_spec = @community.hardware_spec
    if !hardware_spec.image.nil?
      hardware_spec.remove_image!
      hardware_spec.save!
      @community.touch_installation_specification(current_pynwheel_user, "in_progress")
      render json: {success: true, messgae: "Pynwheel touch hardware spec deleted successfully."}
    else
      render json: {success: false, message: "Unable to delete pynwheel touch hardware spec"}
    end
  end

  private

  def set_community
		@community = Community.find params[:id]
    rescue ActiveRecord::RecordNotFound
      render json: {success: false, error_code: 400, message: 'Community not found', data: nil}, status: :not_found
	end
end

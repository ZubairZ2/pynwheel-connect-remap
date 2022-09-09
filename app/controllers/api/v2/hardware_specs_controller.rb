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
        hardware_spec.update_attributes(name: hardware["name"], phone: hardware["phone"], image: hardware["image"])
      else
        hardware_spec = @community.create_hardware_spec(name: hardware["name"], phone: hardware["phone"], image: hardware["image"])
      end
      previous_status = PynwheelLaunch::Communities::CommunityDetailForms.new(@community).check_status_of_specific_form(HARDWARE_SPECS)
      @community.touch_installation_specification(current_pynwheel_user, @status)
      email = PynwheelLaunch::Communities::FollowUpEmails.new(@community).send_emails
        email[:data].each do |mail|
          if mail[:name].eql?(HARDWARE_SPECS) && mail[:status].eql?("Submitted")
            if previous_status[0][:name].eql?(REJECTED)
              FollowUpMailer.send_re_submitted_form(@community, HARDWARE_SPECS, email[:data]).deliver_later
            else
              FollowUpMailer.send_submitted_form(@community, HARDWARE_SPECS, email[:data]).deliver_later
            end
          end
        end
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
      @community.touch_installation_specification(current_pynwheel_user, "")
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

class Api::V2::HardwareSpecsController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :set_community

  def get_pynwheel_touch_hardware_spec
    design = @community.design || @community.create_design
    hardware_image = design.pynwheel_touch_hardware_spec
    if hardware_image.present?
      render json: {success: true, data: hardware_image}
    else
      render json: {success: false, message: "Hardware image not found"}
    end
  end

  def add_pynwheel_touch_hardware_spec
    image = params[:hardware][:image]
    if image.present?
      if @community.design.update_attributes(pynwheel_touch_hardware_spec: image)
        @community.touch_installation_specification(current_pynwheel_user)
        email = PynwheelLaunch::Communities::FollowUpEmails.new(@community).send_emails
        email[:data].each do |mail|
          if mail[:name].eql?(HARDWARE_SPECS) && mail[:status].eql?("Submitted")
            FollowUpMailer.send_submitted_form(@community, HARDWARE_SPECS, email[:data]).deliver_later
          end
        end
        render :json => {success: true, data: @community.design.pynwheel_touch_hardware_spec}
      else
        render json: {success: false, message: "Unable to add hardsware spec image"}
      end
    end
  end

  def delete_pynwheel_touch_hardware_spec
    design = @community.design
    hardware_image = design.pynwheel_touch_hardware_spec
    if hardware_image.present?
      design.remove_pynwheel_touch_hardware_spec!
      design.save
      @community.touch_installation_specification(current_pynwheel_user)
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

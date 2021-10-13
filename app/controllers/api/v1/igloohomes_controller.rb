class Api::V1::IgloohomesController < ActionController::Base
  include IgloohomeApisHelper

  def timezone
    response = get_device_timezone(timezone_making(params[:timezone])) if params[:timezone].present?

    if response.present? && response["payload"].present? &&  response["payload"]["gmtOffset"].present?
      render :json=> {status: true, respnse: response["payload"]}
    else
      render :json=> {status: false, respnse: "Failed to fetch the timezone"}
    end
  end

  def pairing
    response = get_paired_device(params[:timezone], params[:payload]) if params[:timezone].present? && params[:payload].present?

    if response.present? && response["payload"].present? && response["payload"]["bluetoothAdminKey"].present? &&  response["payload"]["masterPin"].present?
      render :json=> {status: true, respnse: response["payload"]}
    else
      render :json=> {status: false, respnse: "Failed to fetch the pairing data"}
    end
  end


  private

  def timezone_making time_zone
    URI.escape(time_zone, Regexp.new("[^#{URI::PATTERN::UNRESERVED}]"))
  end
end
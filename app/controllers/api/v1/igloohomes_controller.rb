module Api
  module V1
    class IgloohomesController < BaseController
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

      def unpairing
        response = unpair_igloo_device(params[:lock_id]) if params[:lock_id].present?
        if response.present? && response["payload"].present?
          unless response["payload"].to_s == "Not Found"
            IgloohomeLock.where(device_id: params[:lock_id]).destroy_all
            render :json=> {status: true, message: "Lock with Id: #{params[:lock_id]} unpaired successfully"}
          else
            render :json=> {status: false, message: "Lock with Id: #{params[:lock_id]} not found"}
          end
        end
      end


      private

      def timezone_making time_zone
        URI.escape(time_zone, Regexp.new("[^#{URI::PATTERN::UNRESERVED}]"))
      end
    end
  end
end

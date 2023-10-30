class Api::V2::CompaniesController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :set_company, only: :import_data_credentials
  before_action :set_community, only: :import_data_credentials

  def import_data_credentials
    case @community.data_provider
    when "yardirentcafe"
      import_rent_cafe_data
    else
      render_response("Please check property's data provider it should be rent cafe", false)
    end
  end

  private

    def import_rent_cafe_data
      update_property_credential()
      if valid_credentials? && @community.data_is_imported
        render_response("Data imported successfully", true)
      else
        render_response('Invalid credentials, Please enter correct credentials before importing data.', false)
      end
    end

    def valid_credentials?
      @community.credentials_are_present? && @community.check_credentials
    end

    def set_company
      @company = Company.find(params[:id])
    rescue ActiveRecord::RecordNotFound => exception
      render_response(exception.message, false)
    end

    def set_community
      @community = @company.communities.find_by(name: params[:property_name])
      render_response('Property not found! Invalid property name', false) unless @community.present?
    end

    def update_property_credential
      @credential = @community.credential || @community.build_credential

      @credential.update(
        api_token:  params[:api_token],
        yardi_rent_cafe_api_url: params[:api_url],
        c_code: params[:c_code],
        p_code: params[:p_code],
        currency: params[:currency]
      )
    end

    def render_response message, status
      render json: { message: message, status: status }
    end
end
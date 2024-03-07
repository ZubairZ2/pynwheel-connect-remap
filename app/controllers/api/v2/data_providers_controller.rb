class Api::V2::DataProvidersController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :set_community
  before_action :verify_credential, only: [:update_data_provider_and_credentials, :update_finish_later_data_provider_and_credentials]

  def get_community_data_provider
    if @community.present?
      @data_provider = @community.data_provider
      @credential = @community.credential
      render json: {success: true, error_code: 200, data: @credential.as_json(@data_provider)}
    end
  end

  def replace_imported_data
    begin
      @community.units.destroy_all
      @community.floorplans.destroy_all

      stop_id = @community.community_tour.tour_stops.where(stop_type: "unit").destroy_all
      VisitedStop.where(tour_stop_id: stop_id.pluck(:id)).destroy_all
      update_data_provider
      data_provider = @community.data_provider
      @credential = update_data_provider_credentials
      if @credential.present?
        connection =test_connection
        if connection[:xml].to_s.include?("error") || connection[:xml].to_s.include?("Error")
          render json: {success: false, error_code: 200, message: "Invalid Credentials", data: @credential.as_json(data_provider)}
        else
          @community.data_is_imported
          previous_status = PynwheelLaunch::Communities::CommunityDetailForms.new(@community).check_status_of_specific_form(PROPERTY_MANAGEMENT_SYSTEM)
          @community.set_data_provider_status(current_pynwheel_user, params["status"])
          FollowUpMailer.send_email_after_form_submission(@community, PROPERTY_MANAGEMENT_SYSTEM, previous_status)
          render json: {success: true, error_code: 200, message: "Valid credentials. Data import succeeded.", data: @credential.as_json(data_provider)}
        end
      else
        render :json => {:success => false, :error_code => 500, :message => @credential&.errors&.full_messages}
      end
    rescue => res
      render json: { success: false, error_code: 400, message: "#{res.message}" }, status: 400
    end
  end

  def update_data_provider_and_credentials
    begin
      update_data_provider
      data_provider = @community.data_provider
      @credential = update_data_provider_credentials
      if @credential.present?
        connection =test_connection
        if connection[:xml].to_s.include?("error") || connection[:xml].to_s.include?("Error")
          render json: {success: false, error_code: 200, message: "Invalid Credentials", data: @credential.as_json(data_provider)}
        else
          @community.data_is_imported
          @community.update_property_management_form_status(current_pynwheel_user, params["status"])
          render json: {success: true, error_code: 200, message: "Valid credentials. Data import succeeded.", data: @credential.as_json(data_provider)}
        end
      else
        render :json => {:success => false, :error_code => 500, :message => @credential&.errors&.full_messages}
      end
    rescue => res
      render json: { success: false, error_code: 400, message: "#{res.message}" }, status: 400
    end
  end

  def update_finish_later_data_provider_and_credentials
    begin
      update_data_provider
      data_provider = @community.data_provider
      @credential = update_data_provider_credentials
      if @credential.present?
        @community.set_data_provider_status(current_pynwheel_user, params["status"])
        render json: {success: true, error_code: 200, message: "#{data_provider} updated successfully", data: @credential.as_json(data_provider)}
      else
        render :json => {:success => false, :error_code => 500, :message => @credential&.errors&.full_messages}
      end
    rescue => res
      render json: { success: false, error_code: 400, message: "#{res.message}" }, status: 400
    end
  end

  def update_data_provider
    data_provider = params[:data_provider]
    @community.update_attributes(data_provider: data_provider)
  end

  def update_data_provider_credentials
    return unless params[:credential].present?
    community_credentials = @community.credential
    if community_credentials.present?
      if community_credentials.update(credential_params)
        credential = community_credentials
        update_crm_credentials if credential&.use_different_crm_provider
      end      
    else
      credential = create_data_provider(community_credentials)
    end
    credential
  end

  def create_data_provider(community_credentials)
    return unless params[:credential].present?
    if community_credentials.present?
      credential = community_credentials.new(credential_params)
    else
      credential = @community.create_credential(credential_params)
    end
    
    if credential
      update_crm_credentials if (params[:use_different_crm_provider] || credential&.use_different_crm_provider)
    end
    credential
  end

  def update_crm_credentials
    return unless params[:crm_credential].present?
    crm_credentials = @community.crm_credential
    if crm_credentials.present?
      crm_credentials.update(crm_credential_params)
    else
      create_crm_credential(crm_credentials)
    end 
  end

  def create_crm_credential(crm_credentials)
    return unless params[:crm_credential].present?
    crm_credentials = @community.create_crm_credential(crm_credential_params)
    crm_credentials
  end

  def verify_credential
    return unless @community.use_company_level_data_settings

    unless @community.company.data_providers.include?(params[:data_provider])
     create_company_level_credential(@community.company)
    end
  end

  private 

  def test_connection
    if @community.credentials_are_present?
      if xml = @community.connect_to_provider
        begin
          return :xml => xml
        rescue
          return {success: false, message: "Please enter correct credentials in settings before importing data.", data: nil}
        end
      else
        return {success: false, message: "Please enter correct credentials in settings before importing data.", data: nil}
      end
    else
      return {success: false, message: "Please enter credentials in settings before importing data.", data: nil}
    end
  end

  def set_community
    @community = Community.find params[:community_id]
    rescue ActiveRecord::RecordNotFound
      render json: {success: false, error_code: 400, message: 'Community not found', data: nil}, status: :not_found
  end

  def render_error(message)
    render json: { success: false, error_code: 200, message: message }
  end

  def create_company_level_credential(company)
    provider = params[:data_provider]
    company.data_providers << provider
    company.save
    if company.credential.present?
      company_credentials = company.credential.update(company_credential_params)
    else
     company_credentials = company.create_credential(company_credential_params)
    end
    if provider == 'yardi'
      company.credential.update_attributes(yardi_username:  params["credential"]["username"], yardi_password: params["credential"]["password"])
    end
    company_credentials
  end

  def company_credential_params
    params.permit(:status)
    params.require(:credential).permit(:id,:url,:entrata_url,:c_code, :pmc_id, :api_token, :server_name, :database, :resman_account_id, :new_requested_data_provider,:yardi_password,:yardi_username,:username,:password)
  end
  def credential_params
    params.permit(:status)
    params.require(:credential).permit(:id,:url,:entrata_url,:username,:password, :perq_property_id, :is_perq_allowed,
      :property_id,:pmc_id,:server_name,:database,:platform,:interface_entity,:site_id,:c_code,:api_token,:p_code,:apply_now,
      :allow_separate_link,:separate_link,:use_different_crm_provider,:limit_result,:file,:resman_apikey, :resman_partner_id,
      :resman_account_id, :xml_filename, :xml_domain, :resman_api_version, :resman_property_id,:zaremba_filename,
      :zaremba_property_id,:zaremba_username,:zaremba_password,:new_requested_data_provider, :rentmanager_username, :rentmanager_password, :rentmanager_property_id)
  end

  def crm_credential_params
    params.permit(:status)
    params.require(:crm_credential).permit(:crm_provider, :entrata_domain, :entrata_username, :entrata_password, :entrata_property_id,
      :realpage_site_id, :realpage_pmc_id, :rentcafe_c_code, :rentcafe_p_code, :rentcafe_domain ,:salesforce_username,
      :yardirentcafe_marketing_api_key, :yardirentcafe_property_id, :yardirentcafe_property_code,:salesforce_password, 
      :salesforce_client_id, :salesforce_secret_id, :salesforce_property_id, :knock_api_key, :knock_community_id, :knock_sms_consent_url, :salesforce_grant_type, :funnel_community_id, :funnel_api_key)
  end

end

class Api::V2::DataProvidersController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :set_community

  def get_community_data_provider
    if @community.present?
      @data_provider = @community.data_provider
      @credential = @community.credential
      render json: {success: true, error_code: 200, data: @credential.as_json(@data_provider)}
    end     
  end

  def update_data_provider_and_credentials
    begin
      update_data_provider
      data_provider = @community.data_provider
      @credential = update_data_provider_credentials
      if @credential.present?
        @community.set_data_provider_status(current_pynwheel_user)
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
      create_data_provider(community_credentials)
    end
    credential
  end

  def create_data_provider(community_credentials)
    return unless params[:credential].present?
    if community_credentials.present?
      credential = community_credentials.new(credential_params)
    else
      credential = Credential.new(credential_params)
    end
    
    if credential.save
      credential.update_attributes(community_id: @community.id)
      update_crm_credentials if (params[:use_different_crm_provider] || credential&.use_different_crm_provider)
    end
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
    if crm_credentials.present?
      crm_credential = crm_credentials.new(crm_credential_params)
    else
      crm_credential = CrmCredential.new(crm_credential_params)
    end
    
    if crm_credential.save
      crm_credential.update_attributes(community_id: @community.id)
    end
  end

  def test_connection
    if @community.credentials_are_present?
      if xml = @community.connect_to_provider
        begin
          render :xml => xml
        rescue
          render json: {success: false,message: "Please enter correct credentials in settings before importing data.", data: nil}
        end
      else
        render json: {success: false,message: "Please enter correct credentials in settings before importing data.", data: nil}
      end
    else
      render json: {success: false,message: "Please enter credentials in settings before importing data.", data: nil}
    end
  end

  private 

  def set_community
    @community = Community.find params[:community_id]
    rescue ActiveRecord::RecordNotFound
      render json: {success: false, error_code: 400, message: 'Community not found', data: nil}, status: :not_found
  end

  def credential_params
    params.require(:credential).permit(:id,:url,:entrata_url,:username,:password, :perq_property_id, :is_perq_allowed,
      :property_id,:pmc_id,:server_name,:database,:platform,:interface_entity,:site_id,:c_code,:api_token,:p_code,:apply_now,
      :allow_separate_link,:separate_link,:use_different_crm_provider,:limit_result,:file,:resman_apikey, :resman_partner_id,
      :resman_account_id, :xml_filename, :xml_domain, :resman_api_version, :resman_property_id,:zaremba_filename,
      :zaremba_property_id,:zaremba_username,:zaremba_password,:new_requested_data_provider)
  end

  def crm_credential_params
    params.require(:crm_credential).permit(:crm_provider, :entrata_domain, :entrata_username, :entrata_password, :entrata_property_id,
      :realpage_site_id, :realpage_pmc_id, :rentcafe_c_code, :rentcafe_p_code, :rentcafe_domain ,:salesforce_username,
      :yardirentcafe_leads_api_user_name, :yardirentcafe_leads_api_password, :yardirentcafe_marketing_api_key,
      :yardirentcafe_company_code, :yardirentcafe_property_id, :yardirentcafe_property_code,:salesforce_password, 
      :salesforce_client_id, :salesforce_secret_id, :salesforce_property_id, :knock_api_key, :knock_community_id, :knock_sms_consent_url, :salesforce_grant_type)
  end

end

class Api::V2::CompaniesController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :set_company, only: [:import_data_credentials, :create_company_credentials, :fetch_entrata_property_ids]
  before_action :set_community, only: :import_data_credentials
  before_action :create_company_credentials, only: :import_data_credentials
  before_action :is_already_setup, only: :import_data_credentials

  def import_data_credentials
    return render_response('Wrong data provider, please check property\'s data provider', false) unless params[:data_provider].present?

    set_data_provider
    import_providers_data
  end

  def fetch_entrata_property_ids
    property_ids = DataProviders::Entrata::PropertiesIdsApiService.new(params).get_property_ids
    render json: { message: 'Properties Ids', properties_ids: property_ids }
  end

  private

    def create_company_credentials
      case params[:data_provider]
      when 'yardirentcafe'
        update_rent_cafe_company_level_credentials
      when 'psi'
        update_entrata_company_level_credentials
      else
        render_response('Wrong data provider', false)
      end
    end

    def import_providers_data
      update_property_credential

      if valid_credentials? && @community.data_is_imported
        @community.update_attributes(use_company_level_data_settings: true)
        render_response('Property data imported successfully', true)
      else
        render_response('Invalid credentials, Please enter correct credentials before importing data.', false)
      end
    end

    def update_property_credential
      case params[:data_provider]
      when 'yardirentcafe' then update_rent_cafe_credentials
      when 'psi' then update_entrata_credentials
      end
    end

    def update_rent_cafe_company_level_credentials
      @credential = @company.credential || @company.build_credential

      if @credential.update(
        api_token: params[:api_token],
        yardi_rent_cafe_api_url: params[:api_url],
        c_code: params[:c_code],
        rentcafe_api_version: params[:rentcafe_api_version]
      )
        @company.data_providers << 'yardirentcafe' unless @company.data_providers.include?('yardirentcafe')
        @company.save
      end
    end

    def update_entrata_company_level_credentials
      @credential = @company.credential || @company.build_credential

      if @credential.update(
        entrata_url: params[:domain],
        username: params[:username],
        password: params[:password],
        currency: params[:currency]
      )
        @company.data_providers << 'psi' unless @company.data_providers.include?('psi')
        @company.save
      end
    end

    def update_rent_cafe_credentials
      @credential = @community.credential || @community.build_credential

      @credential.update(
        api_token: params[:api_token],
        yardi_rent_cafe_api_url: params[:api_url],
        c_code: params[:c_code],
        p_code: params[:p_code],
        currency: params[:currency]
      )
    end

    def update_entrata_credentials
      @credential = @community.credential || @community.build_credential

      @credential.update(
        entrata_url: params[:domain],
        username: params[:username],
        password: params[:password],
        currency: params[:currency],
        property_id: params[:property_id]
      )
    end

    def is_already_setup
      if @community.units.present? || @community.floorplans.present?
        render_response('Property data is already imported!', false)
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
      case params[:data_provider]
      when 'yardirentcafe'
        @community = set_rent_cafe_property()
      when 'psi'
        @community = set_entrata_property()
      end

      render_response('Property not found! Invalid property name or Id', false) unless @community.present?
    end

    def set_rent_cafe_property
      @company.communities.find_by(name: params[:property_name])
    end

    def set_entrata_property
      return nil unless params[:property_id].present?
      credential = Credential.where('LOWER(property_id) iLIKE ?', "%#{params[:property_id].to_s&.downcase}%").last
      credential&.community
    end

    def set_data_provider
      @community.update(data_provider: params[:data_provider]) if params[:data_provider].present?
    end

    def render_response(message, status)
      render json: { message: message, status: status }
    end
end

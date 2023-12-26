class Api::V2::CompaniesController < Api::V2::ApiApplicationController
  require_relative 'helpers/credentials_manager'
  include CredentialsManager

  before_action :doorkeeper_authorize!
  before_action :set_company, only: [:import_data_credentials, :create_company_credentials, :fetch_entrata_property_ids]
  before_action :set_community, only: :import_data_credentials
  before_action :create_company_credentials, only: :import_data_credentials
  before_action :is_already_setup, only: :import_data_credentials

  def import_data_credentials
    return wrong_provider_alert unless params[:data_provider].present?

    set_data_provider
    import_providers_data
  end

  def fetch_entrata_property_ids
    property_ids = DataProviders::Entrata::PropertiesIdsApiService.new(params).get_property_ids
    render json: { message: 'Success! List of properties ids', properties_ids: property_ids }
  end

  private

    def create_company_credentials
      return render_response('Failed! wrong data provider.', false) unless DATA_PROVIDERS_CREDENTIALS.key?(params[:data_provider])
      update_credentials(params[:data_provider], :company)
    end

    def import_providers_data
      update_credentials(params[:data_provider], :community)

      if valid_credentials? && @community.data_is_imported
        set_property_and_community_user
        render_response('Success! Property has been set up.', true)
      else
        render_response('Failed! invalid credentials, Please enter correct credentials before importing data.', false)
      end
    end

    def update_credentials(data_provider, level)
      credentials = DATA_PROVIDERS_CREDENTIALS[data_provider][level]
      @credential = level == :company ? @company.credential || @company.build_credential : @community.credential || @community.build_credential
      @credential.update(credentials_params(credentials))
      
      if level == :company
        @company.data_providers << data_provider unless @company.data_providers.include?(data_provider)
        @company.save      
      end
    end

    def credentials_params(credentials)
      credentials.each_with_object({}) { |(key, param), hash| hash[key] = params[param] }
    end

    def is_already_setup
      if @community&.units.present? || @community&.floorplans.present?
        render_response("Failed! Property has already been set up.", false)
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
      @community = create_community()
    end

    def create_community
      community = find_property()

      unless community.present?
        if params[:property_name].present?
          community = @company.communities.create!(name: params[:property_name])
          community.credential || community.build_credential
        else
          render_response('Failed! Property not found.', false)
        end
      end 

      community
    end

    def set_property_and_community_user
      @community.update_attributes(use_company_level_data_settings: true, pynwheel_launch_access: true)
      CommunityUser.find_or_create_by(user_id: current_pynwheel_user.id, community_id: @community.id)
    end

    def find_property
      credential_criteria = CREDENTIALS_CRITERIA[params[:data_provider]]
      return wrong_provider_alert unless credential_criteria

      column = credential_criteria[:column]
      credential = Credential.where("LOWER(#{column}) LIKE ?", "%#{params[column.to_sym].to_s.downcase}%").last

      community = @company.communities.find_by(id: credential&.community&.id) if credential.present?
      community ||= @company.communities.find_by(name: params[:property_name])

      community
    end


    def set_data_provider
      @community.update(data_provider: params[:data_provider]) if params[:data_provider].present?
    end

    def render_response(message, status)
      render json: { message: message, status: status }
    end

    def wrong_provider_alert
      render_response('Wrong data provider, please check property\'s data provider.', false)
    end
end
class Api::V2::CompaniesController < Api::V2::ApiApplicationController
  include Api::V2::Helpers::CredentialsManager

  before_action :doorkeeper_authorize!
  before_action :check_required_credentials, only: :import_data_credentials
  before_action :set_company, only: [:import_data_credentials, :fetch_entrata_property_ids]
  before_action :set_community, only: :import_data_credentials
  before_action :is_already_setup, only: :import_data_credentials

  def import_data_credentials
    begin
      return wrong_provider_alert unless params[:data_provider].present?

      set_data_provider
      set_credentials
      import_providers_data

    rescue => error
      render_response(error.message, false)
    end
  end

  def fetch_entrata_property_ids
    property_ids = DataProviders::Entrata::PropertiesIdsApiService.new(params).get_property_ids
    render json: { message: 'Success! List of properties ids', properties_ids: property_ids }
  end

  private

    def set_credentials
      update_credentials(params[:data_provider], :community)
    end

    def import_providers_data
      if valid_credentials? && @community.data_is_imported
        update_credentials(params[:data_provider], :company)
        set_property_and_community_user
        render_response('Success! Property has been set up.', true)
      else
        begin 
          PropertyDestroyWorker.perform_async @community&.id
          render_response('Failed! invalid credentials, Please enter correct credentials before importing data.', false)

        rescue => e
          render_response(e.message, false)
        end
      end
    end

    def update_credentials(data_provider, level)
      credentials = DATA_PROVIDERS_CREDENTIALS[data_provider][level]
      @credential = (level == :company) ? (@company.credential || @company.build_credential) : (@community.credential || @community.build_credential)
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
      if @community.present? && @community&.units.present? || @community&.floorplans.present?
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
      begin
        community = find_property()

        unless community.present?
          if params[:property_name].present?
            community = @company.communities.create!(name: params[:property_name])
          else
            render_response('Failed! Property not found.', false)
          end
        end

        community
      rescue => error
        render_response(error.message, false)
      end
    end

    def set_property_and_community_user
      begin
        @community.update(use_company_level_data_settings: true, pynwheel_launch_access: true)
        CommunityUser.find_or_create_by(user_id: current_pynwheel_user.id, community_id: @community.id)
      rescue => error
        render_response(error.message, false)
      end
    end

    def find_property
      begin
        credential_criteria = CREDENTIALS_CRITERIA[params[:data_provider]]
        wrong_provider_alert unless credential_criteria

        column = credential_criteria[:column]
        credential = Credential.where("LOWER(#{column}) LIKE ?", "%#{params[column.to_sym].to_s.downcase}%").last

        community = @company.communities.find_by(id: credential.community_id) if credential.present?
        community ||= @company.communities.find_by(name: params[:property_name])

        community

      rescue => error
        render_response(error.message, false)
      end
    end

    def check_required_credentials
      credential_criteria = CREDENTIALS_CRITERIA[params[:data_provider]]
      wrong_provider_alert unless credential_criteria
      propery_id_or_name_required unless params[:property_name].present? && params[credential_criteria[:column].to_sym].present?
    end

    def set_data_provider
      @community.update(data_provider: params[:data_provider]) if params[:data_provider].present?
    end

    def render_response(message, status)
      render json: { message: message, status: status }
    end

    def wrong_provider_alert
      render_response('Failed! wrong data provider, please check property\'s data provider.', false)
    end

    def propery_id_or_name_required
      render_response('Failed! Property ID or Property Name is missing.', false)
    end
end
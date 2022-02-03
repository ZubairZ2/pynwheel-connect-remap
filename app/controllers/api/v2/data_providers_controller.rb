class Api::V2::DataProvidersController < Api::V2::ApiApplicationController
  before_action :set_community

  def get_community_data_provider
    if @community.present?
      @data_provider = @community.data_provider
      @credential = @community.credential
      render json: {success: true, error_code: 200, data: @credential.as_json(@data_provider)}
    end     
  end

  private 

  def set_community
        @community = Community.find params[:community_id]
    rescue ActiveRecord::RecordNotFound
      render json: {success: false, error_code: 400, message: 'Community not found', data: nil}, status: :not_found
    end
end

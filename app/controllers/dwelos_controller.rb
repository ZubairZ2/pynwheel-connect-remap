class DwelosController < ApplicationController
  # include Error::ErrorHandler
  before_action :set_community
  before_action :check_community
  before_action :set_dwelo, only: [:map_dwelo_locks]
  before_action :set_locks_provider, only: [:create, :update]
  include DweloDevicesHelper
  
  def index
    if @community.dwelo.present?
      community_remote_locks = @community.dwelo.remote_locks
      render json: community_remote_locks
    end

  end

  def new
    @dwelo = Dwelo.new
  end

  def create
    unless @community.dwelo.present?
      @dwelo = Dwelo.create!(client_id: params[:dwelo][:client_id], client_secret: params[:dwelo][:client_secret], default_community_id: params[:dwelo][:default_community_id], community_id: @community.id)
      @community.update_columns(:multiple_locks_provider => @locks_provider)
      redirect_to new_community_dwelo_path(@community), notice: 'Dwelo Account Created Successfully'
    else
      if @dwelo.present?
        @community.update_columns(multiple_locks_provider: @locks_provider)
        flash[:notice] = "Dwelo Account Updated Successfully."
      end
    end

  end

  def edit
    @dwelo_user = Dwelo.find params[:id]
  end

  def update
    @dwelo_user_account = Dwelo.find params[:id]
    @community.update_columns(multiple_locks_provider: @locks_provider)
    if @dwelo_user_account.update!(dwelo_params)
      respond_to do |format|
        format.html { redirect_to new_community_dwelo_path, notice: 'Dwelo account successfully updated.' }
      end
    end
  end

  def upload_lock_image
    @dwelo = current_community.dwelo || Dwelo.new(community_id: current_community.id)

    if params[:type].present? && params[:type] === "amenity"
      @dwelo.update(amenity_lock_image: params[:amenity_lock_image]) if params[:amenity_lock_image].present?
    else
      @dwelo.update(lock_image: params[:lock_image]) if params[:lock_image].present?
    end
  end

  def test_dwelo_connection
    @community = Community.find params[:community_id]
    if @community.enable_locks and @community.multiple_locks_provider.include?("Dwelo") and @community.dwelo.present?
      dwelo_client_credentials(@community.dwelo)
      if @token.present?
        token_type = "Bearer"
        auth_header = token_type + " " + @token

        url = base_url + "/v4/integrations/pynwheel/devices/?community_id=" + @community.dwelo.default_community_id + "&per_page=1000"
        xml = HTTParty.get(url,
                            :headers => {'Authorization' => auth_header,
                                        'Accept' => 'application/vnd.lockstate+json; version=1'})

        render :xml => xml
      else
        flash[:error] = "Data cannot be imported. Please check the credentails or contact your data provider to troubleshoot."
        redirect_to new_community_dwelo_path(@community)
      end
    else
      flash[:error] = "Please enter the Dwelo credentials before testing data."
      redirect_to new_community_dwelo_path(@community)
    end
  end

  def map_dwelo_locks
    @dwelo.map_locks_with_stops
    flash[:notice] =  "Locks are automapped successfully."
    redirect_to new_community_dwelo_path(current_community)
  end

  def remove_dwelo_locks
    if current_community.dwelo.present?
      if current_community.dwelo.remote_locks.present?
        current_community.dwelo.remote_locks.destroy_all
        flash[:notice] = "Locks deleted successfully"
        redirect_to new_community_dwelo_path(current_community)
      else
        flash[:error] = "No locks are present"
        redirect_to new_community_dwelo_path(current_community)
      end
    else
      flash[:error] = "Credentials for Dwelo are missing"
      redirect_to new_community_dwelo_path(current_community)
    end
  end

  private
  
  def set_community
    @community = Community.find(params[:community_id])
  end

  def set_dwelo_user
    @dwelo_user = Dwelo.find params[:community_id]
  end

  def set_locks_provider
    @locks_provider = current_community.multiple_locks_provider
    @locks_provider << "Dwelo" unless @locks_provider.include?("Dwelo")
  end

  def dwelo_params
    params.require(:dwelo).permit(:client_id, :client_secret, :default_community_id,:api_url, :lock_instruction_text, :amenity_lock_instruction_text)
  end
  def set_dwelo
    @dwelo = current_community.dwelo

    unless @dwelo.present?
      flash[:error] = "Please enter the Dwelo credentials before testing data."
      redirect_to new_community_dwelo_path(current_community)
    end
  end
end
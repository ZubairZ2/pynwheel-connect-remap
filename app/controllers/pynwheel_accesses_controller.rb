class PynwheelAccessesController < ApplicationController
  before_action :set_community

  def index
    @faciity_id = get_facility_id @community
    @badge_id = get_badge_id @community
    @card_formate = get_card_formate @community

    @zerv = @community.zerv
    @zerv_user_name = @zerv.username if @zerv.present?
    @zerv_password = @zerv.password if @zerv.present?
    
    if @community.pynwheel_access 
      if @zerv.present? && @zerv_user_name.present? && @zerv_password.present?   
        @token = get_id_token

        if @token.present?
          @pynwheel_acess_users = get_pynwheel_access_users_list(@token)
          @card_formates = ["HID Prox 26-bit H10301", "HID Prox 33-bit D10202", "HID Prox 35-bit C1000", "HID Prox 37-bit H10304", "HID Prox 37-bit H10302"]
          @sub_locations = get_pynwheel_access_sub_locations(@community.name, @token)
        else
          @pynwheel_acess_users = []
        end
      end
    else
      redirect_to root_path
    end
  end

  def delete_pynwheel_access_user
    token = get_id_token

    if token.present?
      response = PynwheelAccessService.new().pynwheel_access_delete_user(params[:phone_number], token)

      if response["payload"]["code"] == "200" && response["payload"]["status"] == "success"
        flash[:notice] = "Pynwheel access user deleted successfully"
      else
        flash[:alert] = "Could not delete pynwheeel access user"      
      end
    end

    redirect_to community_pynwheel_accesses_path(@community)
  end

  def get_pynwheel_user_accesses
    token = get_id_token

    if token.present?
      response = PynwheelAccessService.new().get_pynwheel_user_accesses(params[:phone_number], params[:customer_id], token)
      if response["payload"]["code"] == "200" && response["payload"]["status"] == "success"  
        render json: response["payload"]
      else
        render json: []
      end
    end

  end

  def create_or_update_pynwheel_access_user
    user_data = params["userData"]
    token = get_id_token

    if token.present?
      if user_data["listAddUserAccess"].present?
        user_data["listAddUserAccess"] = user_data["listAddUserAccess"].values

        user_data["listAddUserAccess"].each_with_index do |access, index|
          access["accessStartDate"] = access["accessStartDate"].to_date.strftime("%Y-%m-%d")
          access["accessEndDate"] = access["accessEndDate"].to_date.strftime("%Y-%m-%d") 
        end
      end

      if user_data["id"].present?
        response = PynwheelAccessService.new().update_pynwheel_access_user(user_data, token)
        
        if response["payload"]["code"] == "200" && response["payload"]["status"] == "success"
          flash[:notice] = "Pynwheeel access user updated successfully!"
        else
          flash[:error] = "Can not update pynwheeel access user"
        end
        
      else
        response = PynwheelAccessService.new().create_pynwheel_access_user(user_data, token)

        if response["payload"]["code"] == "200" && response["payload"]["status"] == "success"
          flash[:notice] = "Pynwheeel access user added successfully!"
        else
          flash[:error] = "Can not add pynwheeel access user"
        end
      end
    end

    redirect_to community_pynwheel_accesses_path(@community)
  end

  def active_or_inactive_user
    token = get_id_token
    if token.present?
      response = PynwheelAccessService.new().active_or_inactive_user(params["userActivationPayload"], token)
      if response["payload"]["code"] == "200" && response["payload"]["status"] == "success"
        if params["userActivationPayload"]["active"] == "false"
          flash[:notice] = "User de-activated successfully!"
        else
          flash[:notice] = "User activated successfully!"
        end
      else
        flash[:error] = "User activationf ailed!"  
      end
    else
      flash[:error] = "User activationf ailed!"
    end

    redirect_to community_pynwheel_accesses_path(@community)
  end

  private

  def get_facility_id community
    if community.present? and community.zerv.present? and community.zerv.facility_id.present?
      community.zerv.facility_id
    else
      "123"
    end
  end

  def get_badge_id community
    if community.present? and community.zerv.present? and community.zerv.badge_id.present?
      community.zerv.badge_id
    else
      "5678"
    end
  end

  def get_card_formate community
    if community.present? and community.zerv.present? and community.zerv.card_format.present?
      community.zerv.card_format
    else
      "HID Prox 26-bit H10301"
    end
  end

  def get_id_token
    # token  = Rails.cache.fetch(:pynwheel_access_token, expires_in: 20.minutes.from_now) do
    #   result = get_token_if_login_successful(PynwheelAccessService.new().pynwheel_access_login(@community))      
    #   result.present? ? result : nil
    # end

    # if token.nil? or token.blank? or !Rails.cache.exist?(:pynwheel_access_token)
    #   result = get_token_if_login_successful(PynwheelAccessService.new().pynwheel_access_login(@community))
    #   token = result.present? ? result : nil
    # end

    # return token 
    get_token_if_login_successful(PynwheelAccessService.new().pynwheel_access_login(@community))
  end

  def get_pynwheel_access_sub_locations(location_name, token)
    response = PynwheelAccessService.new().get_pynwheel_access_sub_locations(location_name, token)
    
    if response["payload"]["code"] == "200" && response["payload"]["status"] == "success"
      response["payload"]["listSublocations"]
    else
      []
    end
  end 

  def get_pynwheel_access_users_list token
    get_users_list_if_successful_response(PynwheelAccessService.new().pynwheel_access_get_users(token))
  end

  def get_users_list_if_successful_response response
    if response["payload"]["code"] == "200" && response["payload"]["status"] == "success"
      response["payload"]["listUsers"]
    else
      []
    end 
  end

  def get_token_if_login_successful response
    if response["payload"]["code"] == "200" && response["payload"]["status"] == "success"
      response["payload"]["idToken"]
    else
      nil
    end
  end

  def set_community
    @community = Community.find params[:community_id]
  end
end
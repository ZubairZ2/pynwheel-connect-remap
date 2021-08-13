class PynwheelAccessUsersController < ApplicationController
  before_action :set_community
  before_action :set_pynwheel_access_user, only: [:destroy, :update, :accesses, :remove_pynwheel_user_access]

  def index
    if @community.pynwheel_access
      @pynwheel_access_users =  @community.pynwheel_access_users
    else
      redirect_to root_path
    end
  end

  def create
    pynwheel_access_user = PynwheelAccessUser.new(pynwheel_access_user_params)
    
    if pynwheel_access_user.save!
      # create_user_on_zerv(pynwheel_access_user);
      flash[:notice] = "Pynwheel access user is created successfully"
    else
      flash[:alert] = "Can not create pynwheel access user"
    end
  end

  def update
    if @pynwheel_access_user.update(pynwheel_access_user_params)
      flash[:notice] = "Pynwheel access user is updated successfully"
    else
      flash[:alert] = "Can not update pynwheel access user"
    end
  end

  def destroy
    @pynwheel_access_user.destroy
    # destroy_user_on_zerv(@pynwheel_access_user)
    flash[:notice] = "Pynwheel access user is deleted successfully"
  end

  def accesses
    if @community.present? && @pynwheel_access_user.present?
      @accessible_amenities = user_accessible_amenities( user_accessable_points("amenity") )
      @accessible_units = user_accessible_units( user_accessable_points("unit") )
      @un_accessible_amenities = @community.amenities - @accessible_amenities
      @un_accessible_units = @community.units - @accessible_units
    end
  end

  def grant_units_access

  end

  def grant_amenities_access

  end

  def remove_pynwheel_user_access
    @pynwheel_access_user.resident_access_points.where(access_point_type: params[:access_point_type], access_point_id: params[:access_point_id]).delete_all
    flash[:notice] = "Pynwheel user access is removed successfully"
  end

  private

  def user_accessible_amenities ids
    @community.amenities.where(id: ids)
  end

  def user_accessible_units ids
    @community.units.where(id: ids)
  end

  def user_accessable_points type
    @pynwheel_access_user.resident_access_points.where(access_point_type: type).pluck(:access_point_id)
  end

  def create_user_on_zerv user
    PynwheelAccessService.new().create_pynwheel_access_user(zerv_user_data(user), get_zerv_token(user))
  end

  def update_user_on_zerv
  end

  def destroy_user_on_zerv user
    PynwheelAccessService.new().pynwheel_access_delete_user(user[:phone_number][1..-1], get_zerv_token(user))
  end

  def zerv_user_data user
    {
      firstName: user[:first_name],
      lastName: user[:last_name],
      phoneNumber: user[:phone_number],
      email: user[:email],
      image: nil,
      listAddUserAccess: zerv_user_access(user)
    }
  end

  def zerv_user_access user
    []
  end

  def get_zerv_token user
    response = PynwheelAccessService.new().pynwheel_access_login(user.community)

    if response["payload"]["code"] == "200" && response["payload"]["status"] == "success"
      response["payload"]["idToken"]
    else
      nil
    end
  end

  def set_pynwheel_access_user
    @pynwheel_access_user ||= @community.pynwheel_access_users.where(id: params[:id]).first
  end

  def set_community
    @community ||= Community.find_by_id params[:community_id]
  end

  def pynwheel_access_user_params
    params.require(:pynwheel_access_user).permit!
  end
end
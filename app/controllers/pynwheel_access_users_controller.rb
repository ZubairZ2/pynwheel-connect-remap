class PynwheelAccessUsersController < ApplicationController
  before_action :set_community
  before_action :set_pynwheel_access_user, only: [:destroy, :update]

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
    flash[:notice] = "Pynwheel access user is deleted successfully"
  end

  private

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
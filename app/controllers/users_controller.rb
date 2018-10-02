class UsersController < ApplicationController
  #load_and_authorize_resource
  before_action :set_user, only: [:edit,:update]
  def index
    if current_user.is_super_admin?
      @users = User.where(role: ["Community admin","Community manager"])
    else
      @users = User.find current_user.communities.collect{|c| c.users.map(&:id)}.flatten
    end
  end

  def new
    @user = User.new
  end

  def create
    @user = User.new(user_params)
    @user.password = Devise.friendly_token.first(8)
    if @user.save
      flash[:notice] = "User Created Successfully."
      redirect_to company_employees_path(current_company)
    else
      flash[:error] = @user.errors.full_messages.join(',')
      render :new
    end
  end

  def edit

  end

  def update
    if @user.update(user_params)
      flash[:notice] = alert_message
      redirect_to redirect_path
    else
      flash[:error] = @user.errors.full_messages.join(',')
      render render_action
    end 
  end

  def destroy
    @user = User.find(params[:id])
    @user.destroy
    flash[:notice] = "User deleted successfully."
    redirect_to company_employees_path(current_company)
  end
  def alert_message
    params[:action_name].present? && params[:action_name] == "profile" ? "Profile is updated successfully" : "User is updated successfully"
  end

  def redirect_path
    params[:action_name].present? && params[:action_name] == "profile" ? root_path : company_employees_path(current_company)
  end

  def render_action
    params[:action_name].present? && params[:action_name] == "profile" ? :profile : :edit
  end

  def profile
    @user = User.find params[:employee_id]
  end

  private

  def set_user
    @user = User.find params[:id]
  end

  def user_params
    params.require(:user).permit!
  end
end
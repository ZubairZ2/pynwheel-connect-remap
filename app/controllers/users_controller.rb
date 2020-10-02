class UsersController < ApplicationController
  #load_and_authorize_resource
  before_action :check_community
  before_action :set_user, only: [:edit,:update]
  def index
    if current_user.is_super_admin?
      @users = User.where(role: ["Community admin","Community manager","Super admin","visitor_detail_page"])
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
    chat_enabled_communites = []
    u = User.find(params[:id])
    data = u.communities.pluck(:id)
    chat_enable_communities = params[:enable_community_id].present? ? params[:enable_community_id] : [""] rescue nil
    if @user.update(user_params)
      data.each do |d|
        if params[:user][:community_ids].present?
          unless params[:user][:community_ids].map(&:to_i).include? d
            community = CommunityUser.create(user_id: params[:id], community_id: d)
            chat_enabled_communites.push(community)
          end
        end
      end
      if chat_enable_communities.present?
        chat_enable_communities.each do |community|
          if community.present?
            user_community = CommunityUser.where(community_id: community, user_id: u.id)
            unless user_community.present?
              user_community = chat_enabled_communites.where(community_id: community, user_id: u.id)
              user_community.each do |usercommunity|
                usercommunity.update!(enable_community_id: usercommunity.community_id, chat_enable: true)
              end
            else

              user_community.each do |comunity|
                comunity.update!(enable_community_id: comunity.community_id, chat_enable: true)
              end
            end
          end
        end
        flash[:notice] = alert_message
        redirect_to redirect_path
      else
        flash[:error] = @user.errors.full_messages.join(',')
        render render_action
      end
    end
  end
  def check_community
    unless current_user.is_super_admin?
      if params[:community_id].present?
        all_ids = []
        current_user.communities.each do |c|
          # all_ids.insert(c.id)
          all_ids << c.id
        end
        # byebug
        # puts '+++++++++++++++', all_ids[0]
        if all_ids.include? params[:community_id].to_i

        else
          redirect_to root_path
        end
      end
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
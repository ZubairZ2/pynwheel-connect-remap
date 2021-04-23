class UsersController < ApplicationController
  #load_and_authorize_resource
  before_action :check_community
  before_action :set_user, only: [:edit,:update]
  def index
    if current_user.is_super_admin?
      @users = User.where(role: ["Community admin","Community manager","Super admin","visitor_detail_page", "Dwelo admin","Company admin","Regional admin"])
    elsif current_user.is_dwelo_admin?
      @users = User.where('id IN (?) or role IN (?)', Community.where(creator_id: User.where(role: ["Dwelo admin","Company admin","Regional admin"]).ids).collect{|c| c.users.map(&:id)}.flatten, ["Dwelo admin","Company admin","Regional admin"])
    elsif current_user.is_company_admin? || current_user.is_regional_admin?
      @users = User.where(id: current_user.id)
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

    user = User.find(params[:id])
    if params[:user][:role] == 'Company admin'
      if user.company_id.blank? || user.company.name != (Company.find_by_name params[:user][:company_name]).name
        CommunityUser.where(user_id: params[:id].to_i, community_id: user.communities.pluck(:id)).destroy_all
        user.update_column(:company_id, (Company.find_by_name params[:user][:company_name]).id)
      end
      user.update_column(:region_id, nil) 
    elsif params[:user][:role] == 'Regional admin'
      if user.company_id.blank? || user.company.name == (Company.find_by_name params[:user][:company_name]).name
        if user.region_id.blank? || user.region.id != (params[:user][:region_id]).to_i
          CommunityUser.where(user_id: params[:id].to_i, community_id: user.communities.pluck(:id)).destroy_all
          user.update_column(:company_id, (Company.find_by_name params[:user][:company_name]).id)
          user.update_column(:region_id, (params[:user][:region_id]).to_i) 
        end
      else
        CommunityUser.where(user_id: params[:id].to_i, community_id: user.communities.pluck(:id)).destroy_all
        user.update_column(:company_id, (Company.find_by_name params[:user][:company_name]).id)
        user.update_column(:region_id, (params[:user][:region_id]).to_i) 
      end
    else
      user.update_column(:company_id, nil) 
      user.update_column(:region_id, nil) 
    end

    user_previous_communities_ids = user.communities.pluck(:id)
    new_user_communities_ids = params[:user][:community_ids].present? ? ((params[:user][:community_ids].reject {|e| e.blank?}).map(&:to_i)) : []
    if @user.update(user_params)
      user_previous_communities_ids.each do |id|
        if new_user_communities_ids.present? && !(new_user_communities_ids.include? id)
          community = CommunityUser.create(user_id: params[:id], community_id: id) unless CommunityUser.where(user_id: params[:id], community_id: id).any?
        end
      end
    end
    current_user_communities_ids = user.communities.pluck(:id) # communities_ids of selected user
    user_previous_chat_enabled_communities_ids = CommunityUser.where(user_id: params[:id], community_id: current_user_communities_ids, chat_enable: true).ids
    chat_enable_communities = params[:enable_community_id].present? ? ((params[:enable_community_id].reject {|e| e.blank?}).map(&:to_i)) : [] 
    view_chat_enable_communities_ids = CommunityUser.where(user_id: params[:id], community_id: chat_enable_communities).ids 
    if chat_enable_communities.present? && !view_chat_enable_communities_ids.present? 
      chat_enable_communities.each do |comm_id|
        CommunityUser.create(user_id: params[:id], community_id: comm_id,chat_enable: true) unless CommunityUser.where(user_id: params[:id], community_id: comm_id,chat_enable: true).any?
      end
      view_chat_enable_communities_ids = CommunityUser.where(user_id: params[:id], community_id: chat_enable_communities).ids 
    end
    chat_communities_ids_for_add = view_chat_enable_communities_ids - user_previous_chat_enabled_communities_ids
    chat_communities_ids_for_remove = user_previous_chat_enabled_communities_ids - view_chat_enable_communities_ids
    CommunityUser.where(id: chat_communities_ids_for_add).update_all(chat_enable: true) if chat_communities_ids_for_add.present?
    CommunityUser.where(id: chat_communities_ids_for_remove).update_all(chat_enable: false) if chat_communities_ids_for_remove.present?
    flash[:notice] = alert_message
    redirect_to redirect_path

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
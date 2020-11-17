# frozen_string_literal: true

class Users::SessionsController < Devise::SessionsController
  # before_action :configure_sign_in_params, only: [:create]

  # GET /resource/sign_in
  # def new
  #   super
  # end

  # POST /resource/sign_in
  # def create
  #   super
  # end

  # DELETE /resource/sign_out
  def destroy
    begin
      LoggedInUser.where(browser_id: cookies[:browser_id]).destroy_all          # delete current user record
      chat_enabled_communities_for_current_user = CommunityUser.where(user_id: current_user.id, chat_enable: true).pluck(:community_id).uniq   # current user's chat enabled communities
      chat_enabled_communities_for_current_user = chat_enabled_communities_for_current_user.length > 0 ? chat_enabled_communities_for_current_user : [0]
      chat_enabled_communities_for_logged_in_users = CommunityUser.joins("LEFT JOIN logged_in_users ON logged_in_users.user_id = community_users.user_id").where("logged_in_users.logged_in_count > ? and community_users.chat_enable = ? and community_users.community_id  NOT IN  (?)", 0, true, chat_enabled_communities_for_current_user).pluck(:community_id).uniq
      req_communities = chat_enabled_communities_for_current_user - chat_enabled_communities_for_logged_in_users
      
      # all_users_count = LoggedInUser.where(community_id: cookies[:community_id].to_i).map{|u| u.logged_in_count}.sum
      Community.where(id: req_communities).update_all(is_chat_login: false)
      cookies.delete :browser_id
    rescue
    end

    super
  end

  # protected

  # If you have extra params to permit, append them to the sanitizer.
  # def configure_sign_in_params
  #   devise_parameter_sanitizer.permit(:sign_in, keys: [:attribute])
  # end
end

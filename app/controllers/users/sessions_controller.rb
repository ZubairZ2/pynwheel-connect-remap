class Users::SessionsController < Devise::SessionsController
  def create
    super do |resource|
      unless resource.pynwheel_connect_access
        sign_out
        message = resource.pynwheel_launch_access ? "Sorry! you don't have access for Pynwheel Connect. You are only authorized for Pynwheel launch" : "Sorry! you don't have access for Pynwhhel Connect."
        flash[:error] = message
        redirect_back(fallback_location: root_path)
        return
      end
    end
  end

  def destroy
    begin
      CommunityUser.where(user_id: current_user.id).update_all(is_logged_in: false) # just considered it as a logout user for all assigned communities, doesn't matter whether chat was enabled or not
      online_communities = Community.joins(:community_users).where(communities: {chat_control: true}, community_users: {chat_enable: true, is_logged_in: true}).ids
      Community.where.not(id: online_communities).update_all(is_chat_available: false)
    rescue
    end

    super
  end
end
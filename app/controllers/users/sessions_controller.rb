class Users::SessionsController < Devise::SessionsController
    include Error::ErrorHandler
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
            CommunityUser.where(user_id: current_user.id).update_all(is_logged_in: false) # just considered it as a logout user for all assigned communities, doesn't matter whether chat was enabled or not
            online_communities = Community.joins(:community_users).where(communities: {chat_control: true}, community_users: {chat_enable: true, is_logged_in: true}).ids
            Community.where.not(id: online_communities).update_all(is_chat_available: false)
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
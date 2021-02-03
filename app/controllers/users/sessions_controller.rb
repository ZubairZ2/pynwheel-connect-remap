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
            CommunityUser.where(user_id: current_user.id, chat_enable: true).update_all(is_logged_in: false)
            online_communities = CommunityUser.where(chat_enable: true, is_logged_in: true).pluck(:community_id)
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
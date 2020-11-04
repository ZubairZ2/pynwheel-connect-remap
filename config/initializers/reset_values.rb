Rails.application.config.after_initialize do
    LoggedInUser.destroy_all
    Community.update_all(is_chat_login: false)
end
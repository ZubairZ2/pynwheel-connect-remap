# Be sure to restart your server when you modify this file.
unless Rails.env.test? 
  Rails.application.config.session_store :cookie_store, key: '_pynwheel-cms_session', domain: Rails.env.production? ? "pynwheel.herokuapp.com" :  "pynwheel-staging.herokuapp.com"
else
  Rails.application.config.session_store :cookie_store, key: '_pynwheel-cms_session'
end

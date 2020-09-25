# Be sure to restart your server when you modify this file.
unless Rails.env.development?
  Rails.application.config.session_store :cookie_store, key: '_pynwheel-cms_session' , same_site: :strict , domain: Rails.env.production? ? :all :  "pynwheel-staging.herokuapp.com" 
else
  Rails.application.config.session_store :cookie_store, key: '_pynwheel-cms_session' , same_site: :strict
end

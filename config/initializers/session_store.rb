# Be sure to restart your server when you modify this file.
unless Rails.env.development?
  Rails.application.config.session_store :cookie_store, key: '_pynwheel-cms_session' , same_site: :none , secure: true, domain: Rails.env.production? ? :all :  "pynwheel-staging.herokuapp.com" 

  Rails.application.config.session_store :cookie_store, key: 'session_id' , same_site: :none , secure: true, domain: Rails.env.production? ? :all :  "pynwheel-staging.herokuapp.com"

  Rails.application.config.session_store :cookie_store, key: 'favorite_unit_ids' , same_site: :none , secure: true, domain: Rails.env.production? ? :all :  "pynwheel-staging.herokuapp.com" 

else
  Rails.application.config.session_store :cookie_store, key: '_pynwheel-cms_session' 
end

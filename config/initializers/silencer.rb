require 'silencer/logger'

Rails.application.configure do
  config.middleware.swap(
    Rails::Rack::Logger, 
    Silencer::Logger, 
    config.log_tags,
    silence: ["/api/v1/communities/4/data.json", "/api/v1/communities/list_communities.json","/communities/4/webpages","/email_favorites","/update_unit_floorplan_data","/test_panzoom"]
  )
end
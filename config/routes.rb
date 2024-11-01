Rails.application.routes.draw do

  use_doorkeeper scope: 'api/v2/auth' do
    skip_controllers :applications
  end

  require 'sidekiq/web'

  Rails.application.routes.draw do

    mount Sidekiq::Web => '/sidekiq'
  end

  get 'crm_providers/update'

  get 'tutorial/index'

  mount ActionCable.server => '/cable'

  get 'tour_users/index'
  get '/error', to: 'error_logs#generate_error', as: 'error_logs_generate'
  get '/error_page', to: 'error_logs#error_page', as: 'error_page'
  post :create_tour_user_from, to: 'schedual_tours#create_tour_user_from'
  get :community_custom_tour, to: 'schedual_tours#community_custom_tour'

  get 'community_groups/index'

  post '/schedual_tours/:id', to: 'schedual_tours#update', format: :json
  post '/destroy_schedual_tours/:id', to: 'schedual_tours#destroy', format: :json

  resources :schedual_tours do
    get :get_tour_type, on: :collection
    get :get_funnel_available_times, on: :collection

  end

  post :map_dwelo_locks, to: 'dwelos#map_dwelo_locks'
  get '/id_selfie_matching/:tour_user_id', to: 'tours#id_selfie_matching', as: 'manual_selfie_match', format: :json
  post :flag_id_mismatch, to: 'tours#flag_id_mismatch'

  get 'tours/index'
  post 'tours/customize_tour', to: 'tours#customize_tour'
  delete 'tours/reset_to_standard_tour', to: 'tours#reset_to_standard_tour'

  namespace :scheduler_widget do
    get 'widget', to: 'widgets#widget'
    get 'test_widget', to: 'widgets#test_widget'
    get 'confirmation_instructions', to: 'widgets#confirmation_instructions'
    get 'scheduler_widget_button', to: 'widgets#scheduler_widget_button'
  end

  get 'scheduler/change_schedule_tour_time/:id', to: 'scheduler_widget/widgets#change_tour_time_widget', as: :change_tour_time

  devise_for :users, :controllers => { :invitations => 'invitations', sessions: 'users/sessions', passwords: "users/passwords" }
  post 'users/:id/turn_on_chat', to: 'users#chat_service_available'
  post 'users/:id/turn_off_chat', to: 'users#chat_service_not_available'
  post 'webpages/:id/update_session', to: 'webpages#update_session'

  root to: "home#index"
  resources :chatrooms
  resources :chats
  get 'listening_message', to: 'chats#listening_message'
  post 'mark_all_as_read/:chatroom_id', to: 'chats#reset_unread_messages'
  resources :analytics, only: [:index]
  get '/analytics/get_associated_communities', to: 'analytics#get_associated_communities'

  resources :companies do
    resources :communities
    resources :community_groups
    resources :company_settings

    resources :regions do
      delete :remove_community, on: :member
    end
    
    resources :employees, :controller => 'users' do
      get :profile
    end
    
    collection do
      get :get_regions
      get :company_data_provider_communities_list
    end

    member do
      get :generate_csv
      get :generate_csv_for_scheduled_records
      put :company_data_credentials
    end
  end

  resources :community_groups do
    member do
      delete :remove_community
    end
    
    collection do
      get :add_community
      post :save_community
    end
    
    resources :group_design do
      member do
        post :save_home_page_images
        get :show_image_in_modal
        put :update_home_page_images
        delete :delete_home_page_image
        delete :delete_home_page_video
        get :upload_video_direct
        post :set_loop_type
      end
    end
  end

  resources :images, only: [] do
    collection do
      get :fetch_svg_image
    end
  end

  resources :communities do
    member do
      delete :remove_plots
      post :add_plots
      post :add_plots_on_floorplate
      delete :remove_plots_from_floorplate
      get :suggest_sitemap_units
      get :suggest_floorplate_units
      get :sitemap_auto_plot_units
      get :floorplate_auto_plot_units
      patch :update_amenity_toggle
    end
    
    collection do
      post :make_cordinate
      post :invitation_communities
      post :selected_communities
      get :authenteq_response
      get :authenteq_result
      get :web_cam_test
    end

    resources :building_starting_points
    resources :crm_providers
    resources :remote_locks do
      collection do
        get :authorization_code
        get :client_credentials
      end
    end

    resources :edgestate_accounts do
      collection do
        get :test_edgestate_connection
        post :import_edgestate_locks
        post :map_edgestate_locks
        delete :remove_edgestate_locks
        get :edgestate_code_grant_authorization
        delete :remove_edgestate_auth_account
        post :add_lock_instructions
        put :upload_lock_image
      end
    end

    resources :igloohome_accounts do
      collection do
        delete :remove_igloohome_locks
        post :add_lock_instructions
        put :upload_lock_image
      end
    end

    resources :igloohome_iglooworks_accounts, only: [:create] do
      collection do
        get :test_igloohome_connection
        post :import_igloohome_locks
        post :map_igloohome_locks
      end
    end

    resources :igloohome_v1_accounts do
      collection do
        post :import_single_lock
      end
    end

    resources :igloohome_v2_accounts do
      collection do
        get :test_igloohome_connection
        post :import_igloohome_locks
        post :map_igloohome_locks
        get :igloohome_code_grant_authorization
        post :update_igloo_auth_toggle
        post :update_igloo_home_name
        delete :remove_igloohome_auth_account
      end
    end

    resources :latch_accounts do
      collection do
        put :upload_lock_image
        delete :remove_latch_locks
        get :test_latch_connection
        post :import_latch_locks
        post :map_latch_locks
      end
    end

    resources :dwelos do
      collection do
        put :upload_lock_image
        get :test_dwelo_connection
        delete :remove_dwelo_locks
      end
    end

    resources :zerv_accounts do
      collection do
        get :show_lock_image_in_modal
        put :upload_lock_image
        get :test_zerv_connection
        post :import_zerv_locks
        post :map_zerv_locks
        delete :remove_zerv_locks

      end
    end

    post :save_gallery_settings
    post :save_tour_settings
    post :save_apartment_settings
    post :save_floor_plan_button
    get :import_page
    delete :delete_imported_data
    get :update_imported_data
    get :update_community_data
    get :import
    get :import_pynwheel_access_users_data
    get :clean_psi_units_data
    get :experimental_import
    get :credentials
    get :settings_page
    # get :logs
    get :clone_community
    get :change_expressionist_default
    get :test_connection
    get :psi_pricing_test_connection
    get :psi_space_configuration_test_connection
    get :realpage_load_pricing_data
    post :reset_neighborhood_request_counter
    get :show_realpage_pricing_data
    post :save_temporary_image
    delete :delete_temporary_image
    patch :update_web_maps_configurations
    
    resources :impressions, :only => [:index, :show, :destroy]

    resources :reports, :only => [:index] do
      collection do
        get :generate_webpages_report
        get :properties_average_data_report
        get :generate_salesforce_report
        get :generate_sessions_report
        get :unplotted_units_report
        get :authenteq_report
        get :account_report
        get :tour_feedback_report
        get :partner_analytics_report
        get :maps_no_session_report
      end
    end
    
    resources :schedual_tours, path: 'scheduled_tours' do
      post :update_tour_type
    end

    resources :floorplans do
      resources :amenities, controller: "floorplan_amenities" do
        post :plot_amenity

        collection do
          get :plot_amenities
          delete :remove_amenities_plot
        end

        member do
          delete :remove_amenity
          put :upload_floorplan_amenity_image
        end

      end

      member do
        get :show_floorplan_image_in_modal
        put :crop_image
        get :show_floorplan_secondary_image_in_modal
        delete :remove_pri_scnd_image
        put :crop_secondary_image
      end

      collection do
        post :add_description
        post :save_floorplan_name_order
      end
    end

    resources :elevators do
      resources :elevator_galleries
      resources :elevator_banks

      member do
        delete :remove_elevator_plotting
      end

      collection do
        delete :remove_elevators_plotting
        post :save_elevator_gallery
      end
    end

    resources :amenities do
      resources :amenity_galleries
      collection do
        post :saveAmenityGallery

      end
      member do
        get :edit_amenity_gallery_image
        post :load_remotelock_data
        post :clear_locks
        get :show_amenity_image_in_modal
        put :crop_amenity_image
        put :update_amenity_door_lock
        delete :remove_amenity_door_plot
      end
    end
    resources :tour_users do
        get :lock_ploting
        get :visited_stops_data
        get :checkpoint_verification
        get :reset_tour_stops
    end
    resources :floorplates do
      resources :elevators, controller: "floorplates" do
        post :plot_elevator
      end
      resources :amenities, controller: "floorplate_amenities" do
        post :plot_amenity
        collection do
          get :plot_amenities
          delete :remove_amenities_plot
        end
        member do
          post :plot_amenity_door
          post :load_amenity_door_lock
          delete :remove_amenity
        end
      end
      resources :access_points do
        member do
          get :open_access_point_modal
          post :plot_access_point
          post :add_new_access_points
          post :load_access_point_lock
          put :update_access_point_lock
          delete :remove_access_point_plot
        end
      end
      get :select_floor
      post :select_floor
      get :select_many_floors
      get :plotexp
      get :grid_overlay
      post :adjust_marker_positions
      get :floatplate_images
      post :save_access_point_for_floorplate
    end
    resources :units do
      resources :amenities, controller: "unit_amenities" do
        post :plot_amenity
        collection do
          get :plot_amenities
          delete :remove_amenities_plot
        end
        member do
          delete :remove_amenity
          post :add_description
          post :save_description
          post :delete_unit_plot
        end
      end

      member do
        get :show_unit_image_in_modal
        put :crop_unit_image
        get :show_unit_secondary_image_in_modal
        put :crop_unit_secondary_image
        put :update_lock_provider
        put :display_unit
      end

      member do
        post :load_unit_door_lock
        post :ajaxplotunit
        post :ajaxplotunitforfloorplate
        post :plot_unit_door
        delete :remove_plot
        delete :remove_plot_from_floorplate
        delete :remove_unit_door_plot
        post :adjust_position
        post :load_remotelock_data
        post :clear_locks
        delete :remove_pri_scnd_image
        post :set_amenities_for_units
        put :update_unit_door_lock
      end

      collection do
        post :set_floor
        post :set_building
        post :set_available_date
        post :set_available
        post :set_manual_override
        post :set_sold
        post :add_description
        post :add_additional_fees
        post :set_image
        post :plot_multiple_units_door_for_floorplate
      end
    end
    resources :tutorials do
      collection do
        get :upload_video_direct
      end
    end
    resources :sitemaps do
      resources :amenities, controller: "sitemap_amenities" do
        post :plot_amenity
        collection do
          delete :remove_amenities_plot
        end
        member do
          post :plot_amenity_door
          post :load_amenity_door_lock
          delete :remove_amenity
        end
      end
      resources :access_points do
        member do
          get :open_access_point_modal
          post :plot_access_point
          post :load_access_point_lock
          put :update_access_point_lock
          delete :remove_access_point_plot
        end
      end
      post :save_sitemap_image
      post :save_sitemap_svg
      collection do
        get :plotexp
        get :map
        get :list_amenities
        get :plot_amenities
        get :plot_elevators
        get :grid_overlay
        post :adjust_marker_positions
      end
    end
    resources :settings, only: :index
    resources :design, only: :index do
      collection do
        get :logo
        get :secondary_logo
        get :map_marker_design
        put :crop_logo
        put :crop_secondary_logo
        get :show_logo_in_modal
        get :show_secondary_logo_in_modal
      end
    end
    resources :home_page do
      collection do
        get :upload_video_direct
        get :show_image_in_modal
        post :save_home_page_image
        put :update_home_page_image
        delete :delete_home_page_image
        post :save_home_page_video
        delete :delete_home_page_video
        get :show_home_page_video
        put :update_animation
        get 'iframe'
      end
    end

    resources :tours, only: :index do
      collection do
        post :save_opening_hours
        post :save_guided_opening_hours
      end
      resources :tour_stops do
        member do
          delete :resetTourStopPoint
        end
      end
      collection do
        get :settings
        post :save_starting_point
        get :select_status
        post :select_status
        post :sort_buildings
        post :sort_stops
        post :display_stop
        post :save_tour_settings
        get :building_starting_point
        post :update_building_starting_point
        get :check_point
        get :check_point_id_success
        post :save_check_point_response
        get :starting_point
        get :select_stops
        get :scheduler_widget
        post :save_schedule_widget_btn_setting
        get :edit_amenity
        get :test_automate
      end
      member do
        post :ajaxplotstartingpoint
        post :ajaxplottourstoppoint
        delete :resetStartingPoint
      end
      resources :tour_stops, only: :index do
      end
    end

    resources :homepage_icons, only: [:index, :create, :update] do
      collection do
        get :show_image_in_modal
        post :save_homepage_icon
        put :update_homepage_icon
        delete :delete_homepage_icon
      end
    end

    resources :pynwheel_access_users, only: [:index, :create, :update, :destroy] do
      member do
        get :accesses
        delete :remove_pynwheel_user_access
        post :grant_pynwheel_user_access
      end
    end

    resources :favorite_settings, only: [:index, :create, :update] do
      resources :favorite_images
      resources :ebrochure_menu_buttons
      member do
        get :show_image_in_modal
        post :save_favorite_image
        put :update_favorite_image
        delete :delete_favorite_image
        get :show_images
      end
    end

    resources :neighborhoods, only: [:index, :create, :update] do
      resources :locations
    end

    resources :galleries do
      member do
        get :show_image_in_modal
        post :save_gallery_image
        get :upload_video_direct
        put :update_gallery_image
        delete :delete_gallery_image
        get :show_images
        post :save_gallery_video
      end
    end

    resources :webpages, only: :index do
      collection do
        post :activity_tracking
        get :apply_now
        get :save_favorite
        get :delete_favorite
        get :favorites
        get :favorites_share_link
        get :clear_favorites
        get :ipad_version
      end
    end

    resources :additional_pages, only: :index
    resources :contentpages
    resources :imagepages do
      member do
        get :show_image_in_modal
        post :save_additional_image
        put :update_additional_image
        delete :delete_additional_image
      end
    end

    get 'return_door_lock', to: 'amenities#return_door_lock'
  end

  post '/draw_map_line/:unit_or_amenity', to: 'tours#draw_map_line', as: :draw_line
  post '/add_elevator/:tour_id/:community_id', to: 'tours#add_elevator', as: :create_elevator
  post '/update_elevator', to: 'tours#update_elevator', as: :update_elevator
  get '/remaining_floors', to: 'access_points#remaining_access_point_floors'

  post :save_path_point, to: 'tours#point_save'
  post :update_path_point, to: 'tours#point_update'
  post :delete_path_point, to: 'tours#point_delete'
  post :delete_path_on_sort_change, to: 'tours#delete_path_on_sort_change'

  post :save_hallways_point, to: 'hallways#point_save'
  post :update_hallways_point, to: 'hallways#update_point'
  post :delete_hallways_point, to: 'hallways#remove_point'
  post :connect_leaf_point, to: 'hallways#connect_leaf_point'
  post :save_selected_point, to: 'hallways#save_selected_point'

  resources :automate_plotting, only: :index do
    collection do
      get :shortest_path
    end
  end

  namespace :api, constraints: { format: 'json' } do
    namespace :partner do
      namespace :realync do
        post :update_video_links, to: 'webhooks#update_video_links'
      end

      namespace :maps do
        get :all_maps, to: 'maps#all_maps'
      end
    end

    namespace :self_tour do
      namespace :v1 do
        resources :latch_accounts, only: [:index] do
          collection do
            post :generate_verification_code
            get :get_user_auth_token
          end
        end

        resources :igloohome_accounts, only: [:index] do
          collection do
            get :get_pin_code
          end
        end

        resources :communities do
          get :user_tour_status
          get :initialize_tour
          get :customize_tour
          get :generate_locks_accesses
          post :check_lock_access
          delete :start_tour
        end

        resources :tour_users, only: :update do
          member do
            delete :delete_account
            get :completed_tours
          end

          collection do
            post :generate_otp
            post :verify_otp
            post :get_tour_user
          end
        end
      end
    end

    namespace :touch do
      namespace :v1 do
        resources :communities do
          get :get_neighbourhood_data
        end
      end
    end

    namespace :v2 do
      post '/communities/:community_id/create_new_gallery', to: 'galleries#create_new_gallery'
      get '/communities/:community_id/get_gallery_media', to: 'galleries#get_gallery_media'
      post '/communities/:community_id/upload_gallery_image', to: 'galleries#upload_gallery_image'
      post '/communities/:community_id/update_gallery_status', to: 'galleries#update_gallery_status'
      post '/communities/:community_id/update_gallery_name', to: 'galleries#update_gallery_name'

      get '/communities/:community_id/community_data_provider', to: 'data_providers#get_community_data_provider'
      post '/communities/:community_id/update_data_provider', to: 'data_providers#update_data_provider_and_credentials'
      post '/communities/:community_id/replace_imported_data', to: 'data_providers#replace_imported_data'
      post '/communities/:community_id/save_finsih_later_data_provider', to: 'data_providers#update_finish_later_data_provider_and_credentials'
      get '/communities/:community_id/test_connection', to: 'data_providers#test_connection'
      
      resources :user_details do
        member do
          put :update_company
        end
      end

      resources :companies do
        member do
          post :import_data_credentials
          post :fetch_entrata_property_ids
        end
      end

      resources :communities do
        resources :community_property_map

        resources :floorplans, only: [:index, :create, :destroy] do
          resources :floorplan_amenities, only: [:create, :destroy]
          
          member do
            put :update_floorplan_media
            delete :remove_floorplan_media
          end
          collection do
            post :save_floorplans_form
          end
        end

        resources :amenities,  only: [:index, :create, :destroy] do
          member do
            put :update_amenity_media
            delete :remove_amenity_media
          end
          collection do
            post :save_amenity_form
          end
          resources :amenity_galleries,  only: [:create, :destroy]
        end


        resources :design_direction do
          delete :delete_design_image
        end

        resources :ebrochures do
          post :add_favorite_ebrochure
          delete :delete_ebrochure_weblink
          delete :delete_ebrouchure_image
        end

        resources :tours, only: :index do
          post :add_tour_stops
          delete :delete_tour_stop
        end

        resources :community_additional_pages
        post :add_additional_pages, to: 'community_additional_pages#add_additional_pages'
        delete :delete_imagepage_image, to: 'community_additional_pages#delete_imagepage_image'

        delete :delete_property_map, to: 'community_property_map#delete_property_map'
        delete :delete_label_image, to: 'community_property_map#delete_label_image'
        delete :change_property_type, to: 'community_property_map#change_property_type'
        post :add_property_images, to: 'community_property_map#add_property_images'
        resources :opening_hours
        post :create_opening_hours, to: 'opening_hours#create_opening_hours'
        delete :delete_opening_hours, to: 'opening_hours#delete_opening_hours'
        resources :secure_locks
        post :add_secure_locks, to: 'secure_locks#add_secure_locks'
        post :send_latch_initation_email, to: 'secure_locks#send_latch_initation_email'
        delete :delete_secure_lock, to: 'secure_locks#delete_secure_lock'
        post :remove_igloohome_auth_account, to: 'secure_locks#remove_igloohome_auth_account'
        delete :delete_lock_files, to: 'secure_locks#delete_lock_files'
        post :send_follow_up_emails, to: 'follow_up_emails#send_follow_up_emails'
        get :preview_follow_up_email, to: 'follow_up_emails#preview_follow_up_email'
        get :preview_submit_for_review_email, to: 'follow_up_emails#preview_submit_for_review_email'
        
        resources :community_floor_plans do
          member do
            delete :delete_floorplan_amenity
            delete :delete_floorplan_image
          end
        end

        post :add_floorplan, to: 'community_floor_plans#add_floorplan'
        resources :pynwheel_touch_homepage do
          member do
            delete :delete_homepage_video
          end
        end
        delete :delete_home_page_image, to: 'pynwheel_touch_homepage#delete_home_page_image'
        post :add_homepage_design, to: 'pynwheel_touch_homepage#add_homepage_design'
        post :change_default_design, to: 'pynwheel_touch_homepage#change_default_design'
        member do
          get  :get_pynwheel_touch_hardware_spec, to: 'hardware_specs#get_pynwheel_touch_hardware_spec'
          post :add_pynwheel_touch_hardware_spec, to: 'hardware_specs#add_pynwheel_touch_hardware_spec'
          delete :delete_hardware_spec_details, to: 'hardware_specs#delete_hardware_spec_details'
          delete :delete_pynwheel_touch_hardware_spec_image, to: 'hardware_specs#delete_pynwheel_touch_hardware_spec_image'
          post :add_comment
          post :get_products
          post :update_status_and_remarks
          post :move_to_production
          put :update_products
          get :get_community_detail_forms
          delete :delete_community_logo
        end
        resources :galleries do
          member do
            delete :delete_gallery_image
          end
        end
        resources :data_providers

      end
      resources :access_token do
        collection do
          post :revoke
        end
      end
    end

    namespace :v1 do
      post :authorize, to: 'schedule_tours#authorize_vendor'
      get :properties, to: 'schedule_tours#communities'
      get '/properties/:property_id/tour_types', to: 'schedule_tours#tour_types'
      get '/properties/:property_id/tour_dates', to: 'schedule_tours#tour_dates'
      get '/properties/:property_id/time_slots', to: 'schedule_tours#time_slots'
      post '/schedule_tour', to: 'schedule_tours#schedule_tour'
      put :update_dwelo_access_guest, to: 'dwelo_devices#update_dwelo_access_guest'
      post :salesforce_tour_webhook, to: 'salesforce_webhooks#salesforce_tour_webhook'
      post :salesforce_cancel_tour_webhook, to: 'salesforce_webhooks#salesforce_cancel_tour_webhook'
      post :perq_tour_webhook, to: 'perq_webhooks#perq_tour_webhook'
      post :save_data, to: 'dwelo_devices#load_data'
      post :device_lock_unlock, to: 'dwelo_devices#device_lock_or_unlock'
      get :get_tour_user_by_tour, to: 'communities#get_tour_user_by_tour'
      get :get_tour_user, to: 'communities#get_tour_user'
      get :get_filtered_tours, to: 'communities#get_filtered_tours'
      get :get_count_screen, to: 'communities#get_count_screen'

      post '/communities/:community_id/metro_send_analytics_data', to: 'communities#metro_send_analytics_data'
      post '/communities/:community_id/ipad_send_analytics_data', to: 'communities#ipad_send_analytics_data'

      resources :communities, only: :index do
        member do
          get :data
          get :data_group
          get :community_tours
          get :customize_stops_list
          post :user_saved_tour
          get :tour_configrations
          get :tour_configrations_v1
          post :check_lock_access
          get :tour_user_data
          get :ios_data
          get :minimum_data
          post :email_favorites
          get :get_neighbourhood_data
          get :reset_counter
          get :test_panzoom
          get :unit_and_floorplan_data
          get :update_unit_floorplan_data
          delete :delete_tour_stop
          delete :delete_tour_stop_v1
          delete :delete_tour_stop_v2
        end
        collection do
          get :authenteq
          post :login
          get :list_communities
          get :portico_list_communities
          post :portico_list_communities
          post :lincoln_list_communities
          get :check_version
          post :update_version
        end
      end

      resources :igloohomes do
        collection do
          get :timezone
          post :pairing
          delete :unpairing
        end
      end

      resources :pynwheel_access_users do
        collection do
          get :pynwheel_access_user_authentication
          get :resident_accesses_list
          get :resident_accesses_history
          post :check_lock_access
          post :generate_otp
          post :verify_otp
          post :lock_access_time
          post :dwelo_device_lock_or_unlock
        end
      end

      resources :tours, only: :index do
        collection do
          post :tour_user_login
          post :start_tour_auto_message
          post :save_tour_user_card_info
        end
        member do
          post :tour_user_login
          post :save_user_data
          post :save_user_tour
          post :save_user_selfie
          post :save_user_id_card
          post :feedback
        end
      end
      resources :floorplans, only: :index
      get '/floorplans/:floorplan_id/units', to: 'floorplans#floorplan_units'
      get '/floorplan_amenities', to: 'floorplans#floorplan_amenities'
      post '/update_tour_stops_list', to: 'floorplans#update_tour_stops_list'
      post :save_shared_tour, to: 'tours#save_shared_tour'
      post :checkpoint_verification_response, to: 'tours#checkpoint_verification_response'
      get '/get_floorplan_units', to: 'tours#floorplan_units'
      get '/get_floorplan_list', to: 'tours#floorplan_list'
      get '/get_floorplan_units_v1', to: 'tours#floorplan_units_v1'
      post '/mis_match_verification', to: 'tours#mis_match_verification'
      get '/path/:floorplate_id', to: 'wayfinding#floorplate_path_points'

      post :save_tour_history, to: 'tour_histories#save_tour_history'
      post :alerts_during_tour, to: 'tour_histories#alerts_during_tour'
      get :get_tour_history, to: 'tour_histories#get_tour_history'
      post :verify_property_access_code, to: 'tour_histories#verify_property_access_code'

      get :get_id_selfie_mismatch_status, to: 'tours#get_id_selfie_mismatch'
      post :change_id_selfie_mismatch_status, to: 'tour_histories#change_id_selfie_status'

    end
  end
end

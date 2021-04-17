Rails.application.routes.draw do

  get 'crm_providers/update'

  get 'tutorial/index'

  mount ActionCable.server => '/cable'
  get 'tour_users/index'

  post :create_tour_user_from, to: 'schedual_tours#create_tour_user_from'

  get 'community_groups/index'

  post '/schedual_tours/:id', to: 'schedual_tours#update', format: :json
  post '/destroy_schedual_tours/:id', to: 'schedual_tours#destroy', format: :json
  # post '/update_tour_type', to: 'schedual_tours#update_tour_type', format: :json
  resources :schedual_tours do
    # post :create_tour_user_from
    # member do
    # end
  end
  post :map_dwelo_locks, to: 'dwelos#map_dwelo_locks'
  # selfie matching
  get '/id_selfie_matching/:tour_user_id', to: 'tours#id_selfie_matching', as: 'manual_selfie_match', format: :json
  post :flag_id_mismatch, to: 'tours#flag_id_mismatch'

  get 'tours/index'

  namespace :scheduler_widget do
    get 'widget', to: 'widgets#widget'
    get 'test_widget', to: 'widgets#test_widget'
    get 'scheduler_widget_button', to: 'widgets#scheduler_widget_button'

    # get 'change_schedule_tour_time/:id', to: 'widgets#change_tour_time_widget', as: :change_tour_time

  end
  get 'scheduler/change_schedule_tour_time/:id', to: 'scheduler_widget/widgets#change_tour_time_widget', as: :change_tour_time

  devise_for :users, :controllers => { :invitations => 'invitations', sessions: 'users/sessions' }
  post 'users/:id/turn_on_chat', to: 'users#chat_service_available'
  post 'users/:id/turn_off_chat', to: 'users#chat_service_not_available'

  # For details on the DSL available within this file, see http://guides.rubyonrails.org/routing.html
  root to: "home#index"
  resources :chatrooms
  resources :chats
  get 'listening_message', to: 'chats#listening_message'
  post 'mark_all_as_read/:chatroom_id', to: 'chats#reset_unread_messages'
  resources :companies do
    resources :communities
    resources :community_groups
    resources :employees, :controller => 'users' do
      get :profile
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
  resources :communities do
    member do
      delete :remove_plots
      post :add_plots
      post :add_plots_on_floorplate
      delete :remove_plots_from_floorplate
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
      end
    end

    resources :latch_accounts do
      collection do
        delete :remove_latch_locks
      end
    end

    resources :dwelos do
      collection do
        get :test_dwelo_connection
        delete :remove_dwelo_locks
      end
    end

    resources :zerv_accounts do
      collection do
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
    get :import
    get :experimental_import
    get :credentials
    get :settings_page
    get :logs
    get :clone_community
    get :change_expressionist_default
    get :test_connection
    get :authenteq_report
    get :account_report
    get :psi_pricing_test_connection
    get :psi_space_configuration_test_connection
    get :realpage_load_pricing_data
    get :show_realpage_pricing_data
    post :save_temporary_image
    delete :delete_temporary_image
    resources :schedual_tours do
      post :update_tour_type
      # post :create_tour_user_from
      # member do
      # end
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
      # do
      # post :destroy, controller: 'elevators', action: 'destroy_elevator_gallery'
      # end
      # member do
      #   get :edit_gallery_image_of
      # end
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
        post :extract_floors
        get :show_amenity_image_in_modal
        put :crop_amenity_image
        put :update_amenity_door_lock
        delete :remove_amenity_door_plot
      end
    end
    resources :tour_users do
      get :lock_ploting
      get :checkpoint_verification
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

  #### Hallways Controller Routes ####
  post :save_hallways_point, to: 'hallways#point_save'
  post :update_hallways_point, to: 'hallways#update_point'
  post :delete_hallways_point, to: 'hallways#remove_point'

  namespace :api, constraints: { format: 'json' } do
    namespace :v1 do
      put :update_dwelo_access_guest, to: 'dwelo_devices#update_dwelo_access_guest'
      post :save_data, to: 'dwelo_devices#load_data'
      post :device_lock_unlock, to: 'dwelo_devices#device_lock_or_unlock'
      resources :communities, only: :index do
        member do
          get :data
          get :data_group
          get :community_tours
          post :user_saved_tour
          get :tour_configrations
          get :tour_configrations_v1
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
        end
        collection do
          get :authenteq
          post :login
          get :list_communities
          get :portico_list_communities
          post :portico_list_communities
          post :lincoln_list_communities
          post :update_version
        end
      end
      resources :tours, only: :index do
        collection do
          post :tour_user_login
          post :start_tour_auto_message
        end
        member do
          post :tour_user_login
          post :save_user_data
          post :save_user_tour
          post :save_user_selfie
          post :save_user_id_card
        end
      end
      post :save_shared_tour, to: 'tours#save_shared_tour'
      post :checkpoint_verification_response, to: 'tours#checkpoint_verification_response'
      get '/get_floorplan_units', to: 'tours#floorplan_units'
      post '/mis_match_verification', to: 'tours#mis_match_verification'
      get '/path/:floorplate_id', to: 'wayfinding#floorplate_path_points'

      # 
      post :save_tour_history, to: 'tour_histories#save_tour_history'
      post :alerts_during_tour, to: 'tour_histories#alerts_during_tour'
      get :get_tour_history, to: 'tour_histories#get_tour_history'

      # ID/Selfie get status
      get :get_id_selfie_mismatch_status, to: 'tours#get_id_selfie_mismatch'
      post :change_id_selfie_mismatch_status, to: 'tour_histories#change_id_selfie_status'

    end
  end
end
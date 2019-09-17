Rails.application.routes.draw do

  post :create_tour_user_from, to: 'schedual_tours#create_tour_user_from'

  get 'community_groups/index'

  resources :schedual_tours do
    # post :create_tour_user_from
    # member do
    # end
  end
  get 'tours/index'

  namespace :schedular_widget do
    get 'widget', to: 'widgets#widget'
    get 'test_widget', to: 'widgets#test_widget'
    # post 'test_widget',to: 'widgets#test_widget'
  end 

  devise_for :users, :controllers => { :invitations => 'invitations' }
  # For details on the DSL available within this file, see http://guides.rubyonrails.org/routing.html
  root to: "home#index"
  
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
  end
  resources :communities do
    member do
      delete :remove_plots
      post :add_plots
      post :add_plots_on_floorplate
      delete :remove_plots_from_floorplate
    end
    collection do
      post :invitation_communities
      post :selected_communities
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
    get :change_expressionist_default
    get :test_connection
    get :psi_pricing_test_connection
    get :psi_space_configuration_test_connection
    get :realpage_load_pricing_data
    get :show_realpage_pricing_data
    post :save_temporary_image
    delete :delete_temporary_image
    resources :floorplans do
      resources :amenities,controller: "floorplan_amenities" do
        post :plot_amenity
        collection do
          get :plot_amenities
          delete :remove_amenities_plot
        end
        member do
          delete :remove_amenity
        end
      end
      collection do
        post :add_description
      end
    end
    resources :amenities do
      resources :amenity_galleries
      collection do
        post :saveAmenityGallery

      end
      member do
        get :edit_amenity_gallery_image
      end
    end
    resources :floorplates do
      resources :amenities,controller: "floorplate_amenities" do
        post :plot_amenity
        collection do
          get :plot_amenities
          delete :remove_amenities_plot
        end
        member do
          delete :remove_amenity
        end
      end
      get :plotexp
      get :grid_overlay
      post :adjust_marker_positions
    end
    resources :units do
      resources :amenities,controller: "unit_amenities" do
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
        post :ajaxplotunit
        post :ajaxplotunitforfloorplate
        delete :remove_plot
        delete :remove_plot_from_floorplate
        post :adjust_position
      end
      collection do
        post :set_floor
        post :set_available_date
        post :set_available
        post :set_manual_override
        post :set_sold
        post :add_description
        post :set_image
      end
    end
    resources :sitemaps do
      resources :amenities, controller: "sitemap_amenities" do
        post :plot_amenity
        collection do
          delete :remove_amenities_plot
        end
        member do
          delete :remove_amenity
        end
      end
      post :save_sitemap_image
      collection do
        get :plotexp
        get :map
        get :list_amenities
        get :plot_amenities
        get :grid_overlay
        post :adjust_marker_positions
      end
    end
    resources :settings , only: :index
    resources :design, only: :index do
      collection do
        get :logo
        get :secondary_logo
        get :map_marker_design
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
      resources :tour_stops do
        member do
          delete :resetTourStopPoint
        end
      end
      collection do
        post :save_starting_point
        post :save_tour_settings
        get :starting_point
        get :select_stops
        get :edit_amenity
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
  end
  post '/draw_map_line/:unit_or_amenity', to: 'tours#draw_map_line', as: :draw_line
  
  post :save_path_point, to: 'tours#point_save'
  post :update_path_point, to: 'tours#point_update'
  post :delete_path_point, to: 'tours#point_delete'
  post :delete_path_on_sort_change, to: 'tours#delete_path_on_sort_change'

  namespace :api, constraints: { format: 'json' } do
    namespace :v1 do
      resources :communities, only: :index do
        member do
          get :data
          get :data_group
          get :community_tours
          post :user_saved_tour
          get :ios_data
          get :minimum_data
          post :email_favorites
          get :get_neighbourhood_data
          get :reset_counter
          get :test_panzoom
        end
        collection do
          post :login
          get :list_communities
          get :portico_list_communities
          post :update_version
        end
      end
      resources :tours,only: :index do
        collection do
          post :tour_user_login
        end
        member do
          post :tour_user_login
          post :save_user_data
          post :save_user_tour
        end
      end
      post :save_shared_tour, to: 'tours#save_shared_tour'
      get '/path/:floorplate_id', to: 'wayfinding#floorplate_path_points'

      # 
      post :save_tour_history, to: 'tour_histories#save_tour_history'
      get :get_tour_history, to: 'tour_histories#get_tour_history'
    end
  end
end

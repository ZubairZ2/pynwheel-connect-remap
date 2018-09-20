Rails.application.routes.draw do
  devise_for :users, :controllers => { :invitations => 'invitations' }
  # For details on the DSL available within this file, see http://guides.rubyonrails.org/routing.html
  root to: "home#index"
  
  resources :companies do
    resources :communities
    resources :employees, :controller => 'users' do
      get :profile
    end
  end
  resources :communities do
    member do
      delete :remove_plots
      post :add_plots
      post :add_plots_on_floorplate
      delete :remove_plots_from_floorplate
    end
    post :save_gallery_settings
    post :save_apartment_settings
    post :save_floor_plan_button
    get :import_page
    get :import
    get :experimental_import
    get :credentials
    get :test_connection
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
    end
    resources :amenities
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
      end
    end
    resources :home_page, only: :index do
      collection do
        get :show_image_in_modal
        post :save_home_page_image
        put :update_home_page_image
        delete :delete_home_page_image
        post :save_home_page_video
        delete :delete_home_page_video
        get :show_home_page_video
        put :update_animation
      end
    end

    resources :homepage_icons, only: :index do
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
  namespace :api, constraints: { format: 'json' } do
    namespace :v1 do
      resources :communities, only: :index do
        member do
          get :data
          get :ios_data
          get :minimum_data
          post :email_favorites
        end
        collection do
          post :login
          get :list_communities
          post :update_version
        end
      end
    end
  end
end

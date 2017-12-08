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
      delete :remove_plots_from_floorplate
    end
    get :import_page
    get :import
    get :credentials
    get :test_connection
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
    end
    resources :units do
      member do
        post :ajaxplotunit
        post :ajaxplotunitforfloorplate
        delete :remove_plot
        delete :remove_plot_from_floorplate
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
      collection do
        get :plotexp
        get :map
        get :list_amenities
        get :plot_amenities
      end
    end
    resources :settings , only: :index
    resources :design, only: :index
    resources :home_page, only: :index do
      collection do
        get :show_image_in_modal
        post :save_home_page_image
        put :update_home_page_image
        delete :delete_home_page_image
        post :save_home_page_video
        delete :delete_home_page_video
      end
    end
    resources :webpages, only: :index
    resources :favorite_settings, only: [:index, :create, :update]
    resources :neighborhoods, only: [:index, :create, :update]
    resources :galleries, only: :index do
      collection do
        post :save_gallery_image
      end
    end
  end
  namespace :api, constraints: { format: 'json' } do
    namespace :v1 do
      resources :communities, only: :index do
        member do
          get :data
        end
        collection do
          post :login
        end
      end
    end
  end
end

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
    end
    get :import_page
    get :import
    get :credentials
    get :test_connection
    resources :floorplans
    resources :units do
      member do
        post :ajaxplotunit
      end
    end
    resources :sitemaps do
      collection do
        get :plotexp
        get :map
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
  end
  namespace :api, constraints: { format: 'json' } do
    namespace :v1 do
      resources :communities, only: :index do
        member do
          get :data
        end
      end
    end
  end
end

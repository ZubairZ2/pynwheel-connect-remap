Rails.application.routes.draw do
  devise_for :users
  # For details on the DSL available within this file, see http://guides.rubyonrails.org/routing.html
  root to: "home#index"
  resources :users, only: [:edit,:update]
  resources :companies do
    resources :communities
  end
  resources :communities do
    resources :floorplans
    resources :units
    get :import
    get :credentials
    get :test_connection
    resources :settings , only: :index
  end
end

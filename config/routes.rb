Rails.application.routes.draw do
  # For details on the DSL available within this file, see http://guides.rubyonrails.org/routing.html
  root to: "home#index"
  resources :companies do
    resources :communities
  end
  resources :communities do
    resources :floorplans
    resources :units
    get :import
    get :credentials
    resources :settings , only: :index
  end
  resources :settings , only: :index
end

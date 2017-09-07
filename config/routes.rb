Rails.application.routes.draw do
  # For details on the DSL available within this file, see http://guides.rubyonrails.org/routing.html
  root to: "companies#index"
  resources :companies
  resources :communities do
    resources :floorplans
    resources :units
    get :import
  end
end

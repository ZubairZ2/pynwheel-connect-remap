Rails.application.routes.draw do
  # For details on the DSL available within this file, see http://guides.rubyonrails.org/routing.html
  get "units", to: 'home#units'
  root to: "home#index"
end

Rails.application.routes.draw do
  resources :users, only: [:create, :index, :show]
  resources :products, only: [:create, :index, :show]
  resources :orders, only: [:create, :index, :show] do
    patch :status, on: :member
  end
end

class UsersController < ApplicationController
  def create
    return render_error("Email already exists", :conflict) if User.exists?(email: params[:email])

    user = User.create!(params.permit(:name, :email))
    render json: serialize_user(user), status: :created
  end

  def index
    render json: User.order(:id).map { |user| serialize_user(user) }
  end

  def show
    render json: serialize_user(User.find(params[:id]))
  end

  private

  def serialize_user(user)
    {
      id: user.id,
      name: user.name,
      email: user.email
    }
  end
end

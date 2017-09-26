class UsersController < ApplicationController
	load_and_authorize_resource
	before_action :authenticate_user!
	before_action :set_user, only: [:edit,:update]
	def index
		@users = current_company.users
	end

	def new
		@user = User.new
	end

	def create
		@user = User.new(user_params)
		@user.password = Devise.friendly_token.first(8)
		if @user.save
			flash[:notice] = "User Created Successfully."
			redirect_to company_employees_path(current_company)
		else
			flash[:error] = @user.errors.full_messages.join(',')
			render :new
		end
	end

	def edit

	end

	def update
		if @user.update(user_params)
			flash[:notice] = "User Updated Successfully."
			redirect_to company_employees_path(current_company)
		else
			flash[:error] = @user.errors.full_messages.join(',')
			render :edit
		end 
	end

	def profile
		@user = User.find params[:employee_id]
	end

	private

	def set_user
		@user = User.find params[:id]
	end

	def user_params
		params.require(:user).permit!
	end
end
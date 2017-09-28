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
			flash[:notice] = alert_message
			redirect_to redirect_path
		else
			flash[:error] = @user.errors.full_messages.join(',')
			render render_action
		end 
	end

	def alert_message
	  params[:action_name].present? && params[:action_name] == "profile" ? "Profile is updated successfully" : "User is updated successfully"
	end

	def redirect_path
	  params[:action_name].present? && params[:action_name] == "profile" ? root_path : company_employees_path(current_company)
	end

	def render_action
		params[:action_name].present? && params[:action_name] == "profile" ? :profile : :edit
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
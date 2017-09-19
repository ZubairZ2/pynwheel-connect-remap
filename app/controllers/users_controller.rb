class UsersController < ApplicationController
	before_action :authenticate_user!
	before_action :set_user
	def edit

	end

	def update
		if @user.update(user_params)
			flash[:notice] = "You have updated your profile successfully."
			redirect_to edit_user_path(@user)
		else
			flash[:error] = @user.errors.full_messages.join(',')
			render :edit
		end 
	end
	private

	def set_user
		@user = User.find params[:id]
	end

	def user_params
		params.require(:user).permit!
	end
end
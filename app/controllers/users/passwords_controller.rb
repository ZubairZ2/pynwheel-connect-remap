class Users::PasswordsController < Devise::PasswordsController

  def create
    email = params[:user][:email]
    if email.present?
      user = User.find_by(email: email)
      if user.present?
        if user.first_name.nil?
          redirect_to :back
          flash[:alert] = 'You account is not setup yet.'
        else
          super
        end
      else
        super
      end
    end
  end

  def after_resetting_password_path_for(resource)
    if resource.pynwheel_launch_access && resource.pynwheel_connect_access
      "#{root_url}access_selection.html"
    elsif resource.pynwheel_launch_access
      ENV['PYNWHEEL_LUANCH']
    else
      root_url
    end
  end
end

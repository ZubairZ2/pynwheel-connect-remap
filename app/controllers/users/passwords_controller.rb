class Users::PasswordsController < Devise::PasswordsController

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

class ApplicationController < ActionController::Base
  helper_method :current_community
  before_action :configure_permitted_parameters, if: :devise_controller?
  def current_community
  	if params[:community_id].present?
	  	@community ||= Community.find params[:community_id]
	  else
		  @community = Community.first
	  end  	
  end	
  protect_from_forgery with: :exception
  rescue_from CanCan::AccessDenied do |exception|
    respond_to do |format|
      format.json { head :forbidden, content_type: 'text/html' }
      format.html { redirect_to main_app.root_url, notice: exception.message }
      format.js   { head :forbidden, content_type: 'text/html' }
    end
  end
  protected

  def configure_permitted_parameters
    devise_parameter_sanitizer.permit(:invite, keys: [:role,:company_id])
    devise_parameter_sanitizer.permit(:accept_invitation, keys: [:first_name, :last_name, :avatar])
  end
end

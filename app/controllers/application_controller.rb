class ApplicationController < ActionController::Base
  layout :layout_by_resource
  before_action :configure_permitted_parameters, if: :devise_controller?
  helper_method :current_community
  helper_method :current_company
  def current_community
  	if params[:community_id].present?
	  	@community ||= Community.find params[:community_id]
	  else
		  @community = Community.first
	  end  	
  end	

  def current_company
    if params[:company_id].present?
      session[:company_id] = params[:company_id]
      @company = Company.find params[:company_id]
    elsif session[:company_id].present?  
      @company = Company.find session[:company_id]
    else
      @company = current_community.company 
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

  def layout_by_resource
    if devise_controller?
      "users"
    else
      "application"
    end
  end
    
  def configure_permitted_parameters
    devise_parameter_sanitizer.permit(:invite, keys: [:role,:company_id])
    devise_parameter_sanitizer.permit(:accept_invitation, keys: [:first_name, :last_name, :avatar])
  end
end

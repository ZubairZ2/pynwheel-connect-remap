class ApplicationController < ActionController::Base
  helper_method :current_community
  layout :layout_by_resource
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

  def layout_by_resource
    if devise_controller?
      "users"
    else
      "application"
    end
  end
end

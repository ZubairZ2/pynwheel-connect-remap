class ApplicationController < ActionController::Base
  before_action :set_paper_trail_whodunnit
  before_action :authenticate_user!
  layout :layout_by_resource
  config.time_zone = 'Eastern Time (US & Canada)'
  # before_action :check_community
  before_action :configure_permitted_parameters, if: :devise_controller?
  helper_method :current_community
  helper_method :current_company
  def current_community
  	if params[:community_id].present?
	  	@community ||= Community.find params[:community_id]
	  elsif controller_name =='communities' && params[:id].present?
		  @community ||= Community.find params[:id]
	  end  	
  end
  def info_for_paper_trail
    { community_id: (current_community.present? ? current_community.id : nil),company_id: (current_company.present? ? current_company.id : nil) }
  end

  def current_company
    if params[:company_id].present?
      session[:company_id] = params[:company_id]
      @company = Company.find params[:company_id]
    elsif current_community.present? && !current_community.new_record?
      @company = current_community.company
      session[:company_id] = @company.id
      @company
    elsif session[:company_id].present?
      @company = Company.find session[:company_id] rescue Company.first
    else
      @company = Company.first
    end
  end

  protect_from_forgery prepend: true
  rescue_from CanCan::AccessDenied do |exception|
    respond_to do |format|
      format.json { head :forbidden, content_type: 'text/html' }
      format.html { redirect_to main_app.root_url, notice: exception.message }
      format.js   { head :forbidden, content_type: 'text/html' }
    end
  end

  def after_sign_out_path_for(resource_or_scope)
    if cookies[:community_id].present?
      community = Community.find cookies[:community_id]
      community.update_attributes(is_chat_login: false)
    end
    new_user_session_path
  end

  def after_sign_in_path_for(resource_or_scope)
    root_url
  end

  def check_community
    unless current_user.is_super_admin?
      if params[:community_id].present?
        all_ids = []
        current_user.communities.each do |c|
          # all_ids.insert(c.id)
          all_ids << c.id
        end
        # byebug
        # puts '+++++++++++++++', all_ids[0]
        if all_ids.include? params[:community_id].to_i

        else
          redirect_to root_path
        end
      end
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
    devise_parameter_sanitizer.permit(:invite, keys: [:role,:community_ids=>[]])
    devise_parameter_sanitizer.permit(:accept_invitation, keys: [:first_name, :last_name, :avatar])
  end
end

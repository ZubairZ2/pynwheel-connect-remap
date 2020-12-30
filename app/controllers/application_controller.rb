class ApplicationController < ActionController::Base
  before_action :set_paper_trail_whodunnit
  before_action :authenticate_user!
  layout :layout_by_resource
  config.time_zone = 'Eastern Time (US & Canada)'
  # before_action :check_community
  before_action :configure_permitted_parameters, if: :devise_controller?
  helper_method :current_community
  before_action :community_code
  helper_method :current_company
  helper_method :alphabetical_sort
  before_action :load_tour_users_chats
  # before_action :set_cookies
  def current_community
  	if params[:community_id].present?
	  	@community ||= Community.find params[:community_id]
	  elsif controller_name =='communities' && params[:id].present?
		  @community ||= Community.find params[:id] 
	  end  	
  end
  def community_code
    if current_community.present?
      @community.create_tour unless @community.tour.present?
      @schedule_widget_setting = @community.tour.scheduler_widget_setting || @community.tour.create_scheduler_widget_setting
      @community_code = (JWT.encode ({"community_id" => @community.id}), ENV['SECRET_KEY_BASE_v2'], 'HS256')
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
    begin
      LoggedInUser.where(session_id: cookies[:session_id]).destroy_all
      all_users_count = LoggedInUser.where(community_id: cookies[:community_id].to_i).map{|u| u.logged_in_count}.sum
      if all_users_count == 0
        Community.find_by(id: cookies[:community_id].to_i).update_columns(is_chat_login: false)
        cookies.delete :community_id
        cookies.delete :session_id
      end
    rescue
    end
    new_user_session_path
  end

  def after_sign_in_path_for(resource_or_scope)
    cookies[:session_id] = SecureRandom.hex(8) if cookies[:session_id].nil?
    root_url
  end

  def check_community
    return if params[:controller] == "tour_users" && params[:action]== "show"
    return if params[:controller] == "tour_users" &&(params[:action]== "checkpoint_verification" || params[:action]== "show")
    if current_user.is_dwelo_admin?

      assigned_communities_ids = current_user.communities.ids # all assinged communities
      dwelo_communities_ids = Community.where(creator_id: User.where(role: "Dwelo admin").ids).ids # all communities created by any dwelo admin
      dwelo_companies_communities = Community.joins(:company).where(companies: {creator_id: User.where(role: "Dwelo admin").ids}).ids # all communities under dwelo_companies (either created by dwelo_admin or super_admin)
      ids = (assigned_communities_ids + dwelo_communities_ids + dwelo_companies_communities).uniq
      communities = Community.where(id: ids)

      if params[:community_id].present?
        if communities.ids.include? params[:community_id].to_i
          return
        else
          redirect_to root_path and return
        end
      end
    end

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

  def generate_remotelock_token
      # do block will only execute in case of cache miss
      # token  = Rails.cache.fetch('access_token', expires_in: 1.8.hours.from_now) do
        RemoteLockService.new(current_community).client_credentials
      # end
  end
 
  def load_tour_users_chats
    if current_user.present? and @community.present? and @community.chat_control
      if @community.tour.present?
          all_communities = current_user.communities.map{|community| community.id}
          if all_communities.include?(@community.id) || current_user.role == "Super admin"
              @chatrooms = Chatroom.where(tour_id: @community.tour.id).includes(:chats, :tour, :tour_user)
              @listening_channels = [(@community.name.gsub(/[^0-9a-z ]/i, '') + "_with_id_" + @community.id.to_s).gsub(' ', '_')]

              @notifications =  @chatrooms.map{ |chatroom| notifications_by_chatroom(@community, chatroom) }
              @chatroom_list = @chatrooms.map{|c| c.id}
              @default_user_image =  "/assets/chat-tour-user.jpg"
          end
      end
    end
  end
  
  def notifications_by_chatroom(community,chatroom)
    all_community_members = community.users
    min_count = 99999
    all_community_members.each do |user|
      count = Chat.where("chatroom_id = ? AND  name != ? ", chatroom.id, "Support Team").unread_by(user).count
      if count < min_count
        min_count = count 
      end
    end
    if all_community_members.count == 0
      min_count=0
    end 
    [chatroom.id , min_count]
  end
  
  # def set_cookies
  #   cookies[:session_id] = SecureRandom.hex(8) if cookies[:session_id].nil?
  #   cookies[:community_id] = current_community.id if current_community.present? and cookies[:community_id].nil?
  # end

  def alphabetical_sort(company_or_community_or_community_groups)
    company_or_community_or_community_groups.sort_by { |c| ((c.name.include?("(Dwelo)") or c.name.include?("The")) ? c.name.split(" ", 2)[1] : c.name).downcase }
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

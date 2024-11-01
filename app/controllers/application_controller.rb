class ApplicationController < ActionController::Base
  before_action :set_paper_trail_whodunnit
  before_action :authenticate_user!, except: :generate_error
  layout :layout_by_resource
  config.time_zone = 'Eastern Time (US & Canada)'
  before_action :configure_permitted_parameters, if: :devise_controller?
  helper_method :current_community
  before_action :community_code
  helper_method :current_company
  helper_method :alphabetical_sort
  helper_method :show_chat_support
  before_action :load_tour_users_chats

  def current_community
  	if params[:community_id].present?
      session[:community_id] = params[:community_id]
	  	@community ||= Community.find_by_id params[:community_id]
	  elsif controller_name =='communities' && params[:id].present?
		  @community ||= Community.find_by_id params[:id]
	  end
  end
  
  def community_code
    if current_community.present?
      @community.create_tour unless @community.community_tour.present?
      @schedule_widget_setting = @community.community_tour.scheduler_widget_setting || @community.community_tour.create_scheduler_widget_setting
      @community_code = (JWT.encode ({"community_id" => @community.id}), ENV['SECRET_KEY_BASE_v2'], 'HS256')
    end
  end

  def info_for_paper_trail
    { community_id: (current_community.present? ? current_community.id : nil),company_id: (current_company.present? ? current_company.id : nil) }
  end

  def current_company
    if current_user.present? && (current_user.is_company_admin? || current_user.is_regional_admin?) && current_user.company.present?
      @company = current_user.company
    elsif params[:company_id].present?
      session[:company_id] = params[:company_id]
      @company = Company.find_by_id params[:company_id] if params[:company_id].present?
    elsif current_community.present? && !current_community.new_record?
      @company = current_community.company
      session[:company_id] = @company.id
      @company
    elsif session[:company_id].present?
      @company = Company.find_by_id session[:company_id] rescue Company.first
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
    new_user_session_path
  end

  def after_sign_in_path_for(resource_or_scope)
    root_url
  end

  def after_accept_path_for(resource_or_scope)
    get_redirection_link
  end

  def get_redirection_link
    if current_user.pynwheel_launch_access && current_user.pynwheel_connect_access
    "#{root_url}access_selection.html"
    elsif current_user.pynwheel_launch_access
     ENV['PYNWHEEL_LUANCH']
    else
     root_url
    end
  end

  def check_community
    return if params[:controller] == "tour_users" && params[:action]== "show"
    return if params[:controller] == "tour_users" &&(params[:action]== "checkpoint_verification" || params[:action]== "show")
    if current_user.is_dwelo_admin?

      assigned_communities_ids = current_user.communities.ids # all assinged communities
      dwelo_communities_ids = Community.where(creator_id: User.where(role: "Dwelo admin").ids).ids # all communities created by any dwelo admin
      dwelo_companies_communities = Community.joins(:company).where(companies: {creator_id: User.where(role: "Dwelo admin").ids}).ids # all communities under dwelo_companies (either created by dwelo_admin or super_admin)
      ids = (assigned_communities_ids + dwelo_communities_ids + dwelo_companies_communities).distinct
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
          all_ids << c.id
        end
        if all_ids.include? params[:community_id].to_i

        else
          redirect_to root_path
        end
      end
    end
  end

  def generate_remotelock_token
    edge_state_account = current_community.edge_state

    if edge_state_account.client_id.present? && edge_state_account.client_secret.present?
      RemoteLockService.new(current_community).client_credentials
    elsif edge_state_account.refresh_token.present?
      RemoteLockService.new(current_community).get_access_token_after_refresh
    end
  end

  def load_tour_users_chats
    unless request.xhr?
      if current_user.present? and @community.present? and @community.community_tour.present?
        chat_enabled_communities = current_user.communities.where(community_users: { chat_enable: true }).distinct.includes(:tour)
        @chatrooms = Chatroom.where(tour_id: chat_enabled_communities.map{|c| c.community_tour.id if c.community_tour.present?}).includes(:chats, :tour, :tour_user)
        @listening_channels = chat_enabled_communities.map{|c| (c.name + "_with_id_" + c.id.to_s).parameterize.gsub("-", "").gsub("_", "")}
        @notifications =  @chatrooms.map{ |chatroom| notifications_by_chatroom(@community, chatroom) }
        @chatroom_list = @chatrooms.map{|c| c.id}
        @default_user_image =  "/assets/chat-tour-user.jpg"
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

  def alphabetical_sort(recods)
    recods = recods.map{|r| r if r.name != DUMMY_COMMUNITY_NAME}.compact
    # recods.sort_by { |c| ((c.name.include?("(Dwelo)") or c.name.include?("The")) ? c.name.split(" ", 2)[1] : c.name).downcase }
    recods.sort_by { |c| ((c.name.include?("(Dwelo)") or c.name.include?("The")) ? (c.name&.split(" ", 2)[1].present? ? c.name&.split(" ", 2)[1] : c.name&.split(" ", 2)[0]) : c.name).downcase }
  end

  def show_chat_support
    current_community.present? ? CommunityUser.where(user_id: current_user.id, chat_enable: true).exists? : false rescue false
  end

  def make_sure_one_selected_hallway(hallways)
    if hallways.present? && !hallways.where(selected: true).any?
      hallway = hallways.last
      hallway.selected = true
      hallway.save
      hallways.last.selected = true
    end

    hallways
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
    devise_parameter_sanitizer.permit(:invite, keys: [:company_id,:pynwheel_launch_access,:pynwheel_connect_access,:region_id,:role,:community_ids=>[]])
    devise_parameter_sanitizer.permit(:accept_invitation, keys: [:first_name, :last_name, :avatar])
  end
end

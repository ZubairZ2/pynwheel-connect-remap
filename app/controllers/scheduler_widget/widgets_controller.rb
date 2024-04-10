class SchedulerWidget::WidgetsController < ApplicationController
	skip_before_action :verify_authenticity_token
  skip_before_action :authenticate_user!
  after_action :allow_iframe
  layout 'widget'

  def widget
    respond_to do |format|
      format.html do
        # load data to show in the view
        @data = User.take 10
        render :widget
      end
      format.js do
        render :widget_layout
      end
    end
  end
  def scheduler_widget_button
    @schedule_widget_setting= SchedulerWidgetSetting.find params[:id]
    @community_code = params[:community_code]
    @community = Community.find params[:community_id]
    render :scheduler_widget_button, layout: false
  end

  def test_widget
    @tour_user = params[:tour_user_id].present? ? TourUser.find_by_id(params[:tour_user_id]) : TourUser.new
    @reschedule_tour = params[:reschedule_tour] if params[:reschedule_tour].present?
    @scheduled_tour_id = params[:schedule_tour_id] if params[:schedule_tour_id].present?
    @scheduled_tour_for_another_tour = SchedualTour.find @scheduled_tour_id if @scheduled_tour_id.present?
    @exiting_schedule_tour = SchedualTour.find_by(community_id: params[:community_id])
    @schedule_tour = params[:scheduled_tour_id].present? ? SchedualTour.find_by_id(params[:scheduled_tour_id]) : @exiting_schedule_tour.present? ? @exiting_schedule_tour : SchedualTour.create(community_id: params[:community_id])
    @schedule_tour.property_tour_type = params[:property_tour_type].present? ? params[:property_tour_type] : "scheduled_tour"
    @phone_country_code = ISO3166::Country.new(@schedule_tour.country_code) if @schedule_tour.country_code.present?
    @community_id = params[:community_id]
    @community = Community.find params[:community_id]
    @scheduler_widget_setting = @community.community_tour.scheduler_widget_setting
    @credit_card_required =  @community.community_tour.credit_card_required
    @bedroom_list = @community.fetch_bedroom_list()
    @marketing_source_required = @community.community_tour.marketing_source_required
    @community_time_zone = @community.get_time_zone()
    @current_time = Time.now.in_time_zone(@community_time_zone).strftime("%H:%M %p") if @community_time_zone.present?

    if params[:direct].present?
      @direct =  true
      params[:message].present? ? @show_first = false : @show_first = true
      decoded = JWT.decode params[:community_code], ENV['SECRET_KEY_BASE_v2'], true, { algorithm: 'HS256' } rescue nil
      unless decoded[0]["community_id"].to_i == params[:community_id].to_i
        raise ActionController::RoutingError.new('Not Found')
      end
    else
      @direct =  false
    end
    
    @use_yardi_as_lead = @community.use_yardi_as_lead?
    @is_virtual_on = @community.is_virtual_permission_on
    @any_tour_type_selected = @community.is_any_tour_type_selected
    @disable_day_of_week = @community.collect_disable_days
    @stepping = @community.community_tour.tour_setting.time_intervel == '15 min' ? 15 : (@community.community_tour.tour_setting.time_intervel == '30 min' ? 30 : (@community.community_tour.tour_setting.time_intervel == '1 hr') ? 60 : (@community.community_tour.tour_setting.time_intervel == '2 hrs') ? 120 : 15) rescue 15
    @tour_type = @schedule_tour.tour_type if @reschedule_tour.present?
    @existing_tour_users = scheduled_tour_users @community
    @enabled_tour_types = community_allowed_tour_types(@community)
    @tour_type_count = @enabled_tour_types.count
    @default_country_code = @community.fetch_country_code()
    cutt_of = @stepping < 60 ? @stepping.to_s + " minutes" : (@stepping == 60 ? "1 hour" : "2 hours")
    
    if @use_yardi_as_lead
      @yardi_time_slots = @community.available_slots(@schedule_tour)
      if @community.credential.rentcafe_api_version == "RentCafe V2"
        if @yardi_time_slots.present?
          @yardi_self_time_slots = @yardi_time_slots.map{|x|  [x["startTime"].split(' ')[0],"#{x["startTime"].split(' ')[1]} #{x["startTime"].split(' ')[2]}","#{x["endTime"].split(' ')[1]} #{x["endTime"].split(' ')[2]}" ] if x['slotType'] == "SelfTour"}.compact
          @yardi_guided_time_slots = @yardi_time_slots.map{|x| [x["startTime"].split(' ')[0],"#{x["startTime"].split(' ')[1]} #{x["startTime"].split(' ')[2]}","#{x["endTime"].split(' ')[1]} #{x["endTime"].split(' ')[2]}" ] if x['slotType'] == "AgentGuided"}.compact
          @time_slots = @community.collect_time_slots_for_yardi(@stepping, @yardi_self_time_slots, @yardi_guided_time_slots)
          @yardi_enable_days = @time_slots.keys
        else
          @time_slots = @reschedule_tour ? @community.collect_time_slots_for_rechedule_tours(@stepping,@tour_type) : @community.collect_time_slots(@stepping)
          @yardi_enable_days = []
          @use_yardi_as_lead = false
        end
      else
        if @yardi_time_slots["Response"].present?
          @yardi_self_time_slots = @yardi_time_slots["Response"][0]["AvailableSlots"].map{|x| [x["dtStart"].split(' ')[0],x["dtStart"].split(' ')[1],x["dtEnd"].split(' ')[1]  ] if x['TypeofSlot'] == "SelfTour"}.compact
          @yardi_guided_time_slots = @yardi_time_slots["Response"][0]["AvailableSlots"].map{|x| [x["dtStart"].split(' ')[0],x["dtStart"].split(' ')[1],x["dtEnd"].split(' ')[1]  ] if x['TypeofSlot'] == "GuidedTour"}.compact
          @time_slots = @community.collect_time_slots_for_yardi(@stepping, @yardi_self_time_slots, @yardi_guided_time_slots)
          @yardi_enable_days = @time_slots.keys
        else
          @time_slots = @reschedule_tour ? @community.collect_time_slots_for_rechedule_tours(@stepping,@tour_type) : @community.collect_time_slots(@stepping)
          @yardi_enable_days = []
          @use_yardi_as_lead = false
        end
      end
    else
      @time_slots = @reschedule_tour ? @community.collect_time_slots_for_rechedule_tours(@stepping,@tour_type) : @community.collect_time_slots(@stepping)
      @yardi_enable_days = []
      @use_yardi_as_lead = false
    end

    @is_knock_community = @schedule_tour.community.is_knock_community?
    @knock_available_slots =  @is_knock_community ? KnockService.new(@schedule_tour).available_slots : {}

    @is_funnel_community = @schedule_tour.community.is_funnel_community?
    @funnel_available_days =  @is_funnel_community ? FunnelService.new(@schedule_tour).get_available_days : {}
    @funnel_discovery_sources = @is_funnel_community ? FunnelService.new(@schedule_tour).get_discovery_sources : []
    @selected_discovery_source = @is_funnel_community ? (@schedule_tour&.funnel_prospect_discover_source.present? ? @funnel_discovery_sources.map{|s| s[0] if s[1] == @schedule_tour&.funnel_prospect_discover_source.to_i }&.compact&.uniq[0] : "Select an option" ) : ""
    
    @occupied_slots = OccupiedTourTimeSlotsService.new(@community).occupied_slots()
    @occupied_dates = @occupied_slots&.keys rescue []
    @is_allowed_schedule = can_user_schedule_tour(@tour_type_count, @community)

    community = Community.find params[:community_id]
    app_link = (Company.find community.company_id).name.downcase == "lincoln" ? "https://apps.apple.com/us/app/lincoln-property-self-tour/id1508997129" : "https://apps.apple.com/us/app/self-tour/id1488907392"
    android_link = (Company.find community.company_id).name.downcase == "lincoln" ? "https://play.google.com/store/apps/details?id=com.pynwheel.lincolnselftour" : "https://play.google.com/store/apps/details?id=com.pynwheel.selftour"
    tour_type = params[:tour_type]
    property_tour_type = params[:property_tour_type] if params[:property_tour_type].present?
    flash[:success] = params[:message] if params[:message].present?
    render :test_widget, locals: {ios_link: app_link,android_link: android_link,property_tour_type: property_tour_type,community_name: community.name,tour_type: tour_type}, layout: false
  end

  def confirmation_instructions
    community = Community.find params[:community_id]
    schedual_tour = SchedualTour.find params[:schedual_tour] if params[:schedual_tour].present?
    reschedule = params[:reschedule]
    app_link = (Company.find community.company_id).name.downcase == "lincoln" ? "https://apps.apple.com/us/app/lincoln-property-self-tour/id1508997129" : "https://apps.apple.com/us/app/self-tour/id1488907392"
    android_link = (Company.find community.company_id).name.downcase == "lincoln" ? "https://play.google.com/store/apps/details?id=com.pynwheel.lincolnselftour" : "https://play.google.com/store/apps/details?id=com.pynwheel.selftour"  
    property_tour_type = schedual_tour.property_tour_type
    tour_type = schedual_tour.tour_type
    flash[:success] = params[:message] if params[:message].present?
    render :test_widget_confirmation, locals: {ios_link: app_link,android_link: android_link,schedual_tour: schedual_tour,is_rescheduled: reschedule,property_tour_type: property_tour_type,community_name: community.name,tour_type: tour_type}, layout: false
  end

  #TODO:: Remove this action after finalizing the reschedule form
  def change_tour_time_widget
    @schedule_tour = SchedualTour.find params[:id]
    @community = Community.find @schedule_tour.community_id
    app_link = (Company.find @community.company_id).name.downcase == "lincoln" ? "https://apps.apple.com/us/app/lincoln-property-self-tour/id1508997129" : "https://apps.apple.com/us/app/self-tour/id1488907392"
    android_link = (Company.find @community.company_id).name.downcase == "lincoln" ? "https://play.google.com/store/apps/details?id=com.pynwheel.lincolnselftour" : "https://play.google.com/store/apps/details?id=com.pynwheel.selftour"  
    reschedule_tour = false
    property_tour_type = @schedule_tour.property_tour_type
    tour_type = @schedule_tour.tour_type
    render :change_tour_time_widget, locals: {ios_link: app_link,android_link: android_link,property_tour_type: property_tour_type,tour_type: tour_type,community_name: @community.name}
  end

  private

  def can_user_schedule_tour tour_type_count, community
    tour_type_count > 0 && community.self_tour && (community.scheduler_widget.nil? ? true : community.scheduler_widget) && !community.locked
  end

  def community_allowed_tour_types community
    tour = community.community_tour

    if tour.present?
      if (tour&.tour_setting&.allow_self_tour) && (tour&.tour_setting&.allow_guided_tour)
        [["self_tour", "Self Tour"], ["guided_tour", "Guided Tour"]]
      elsif tour&.tour_setting&.allow_self_tour
        [["self_tour", "Self Tour"]]
      elsif tour&.tour_setting&.allow_guided_tour
        [["guided_tour", "Guided Tour"]]
      else
        []
      end
    else
      []
    end
  end

  def allow_iframe
    response.headers.except! 'X-Frame-Options'
  end

  def scheduled_tour_users community
    scheduled_tours = SchedualTour.where(community_id: community.id).where.not(tour_user_id: nil)
    tour_user_ids = scheduled_tours_in_future(scheduled_tours, community)
    emails = TourUser.where(id: tour_user_ids).pluck(:email).uniq
    phone_numbers = TourUser.where(id: tour_user_ids).pluck(:phone_number).uniq

    {emails: emails, phone_numbers: phone_numbers}
  end

  def scheduled_tours_in_future(scheduled_tours, community, tour_user_ids = [], community_time_zone = nil)
      community_time_zone = community.get_time_zone()
      
      scheduled_tours.find_each do |tour|
        unless tour.is_tour_completed
          grace_period = community&.community_tour&.grace_period
          is_in_timezone = ( ((tour.tour_date.to_s + " " + tour.tour_time.strftime("%I:%M%p")).in_time_zone(community_time_zone)) + grace_period.minutes ) > Time.now.in_time_zone(community_time_zone) if (tour.tour_date && tour.tour_time).present?
          tour_user_ids << tour.tour_user_id if is_in_timezone
        end
      end  

      tour_user_ids
  end
end

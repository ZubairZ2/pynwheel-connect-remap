class SchedualToursController < ApplicationController
  # include Error::ErrorHandler
  before_action :set_schedual_tour, only: [:show, :edit, :update, :destroy]
  skip_before_action :authenticate_user!
  include StripeServices
  include SchedualToursHelper

  # GET /schedual_tours
  # GET /schedual_tours.json
  def index
    community_id = params['community'] if params['community'].present?
    community = community_id rescue @community.id
    respond_to do |format|
      format.html
      format.json { render json: SchedualToursDatatable.new(view_context,community) }
    end
  end

  # GET /schedual_tours/1
  # GET /schedual_tours/1.json
  def show
  end

  # GET /schedual_tours/new
  def new
    @schedual_tour = SchedualTour.new
  end

  # GET /schedual_tours/1/edit
  def edit
  end

  def change_tour_time
    
  end

  def community_custom_tour
    tour_user = TourUser.find params['tour_user_id'] if params['tour_user_id'].present?
    scheduled_tour = SchedualTour.find params['scheduled_tour_id'] if params['scheduled_tour_id'].present?
    community = scheduled_tour.community
    @community_tour_stops = get_user_tour_stops(community)
    community_code = (JWT.encode ({"community_id" => community.id}), ENV['SECRET_KEY_BASE_v2'], 'HS256') if community.present?
    render partial: 'schedual_tours/custom_tour', :locals => {tour_user: tour_user, tour: scheduled_tour, community: community, community_code: community_code, community_tour_stops:  @community_tour_stops }
  end
  
  def create_tour_user_from
    phone_number = make_phone
    tu = TourUserSearcherService.new(phone_number, params[:tour_user][:email].downcase).find_tour_user()

    community = Community.find_by_id params[:community_id]
    realpage_marketing_source = ""
    cm = community.credential.realpage_marketing_sources.each {|s| realpage_marketing_source = s['Text'] if s['Value'] == params['marketing_source']} if community&.credential&.realpage_marketing_sources.present?
    f_name = params[:tour_user][:first_name].present? ? params[:tour_user][:first_name] : ""
    l_name = params[:tour_user][:last_name].present? ? params[:tour_user][:last_name] : ""
    tu = TourUser.new name: (f_name + " " + l_name), first_name: params[:tour_user][:first_name], last_name: params[:tour_user][:last_name], email: params[:tour_user][:email].downcase, phone_number: phone_number, card_expiry: params[:tour_user][:card_expiry] unless tu.present?
    tu.name = (f_name + " " + l_name)
    tu.first_name = f_name
    tu.last_name = l_name
    tu.phone_number =  phone_number.present? ? phone_number : tu.phone_number
    tu.email = params[:tour_user][:email].present? ? params[:tour_user][:email].downcase : tu.email
    tu.desired_bedroom = params[:desired_bedroom]
    tu.card_last_digits = params[:last_digits] if params[:last_digits].present?
    tu.is_sms_enabled = params[:tour_user][:is_sms_enabled] == "0" ? false : true

    if tu.save
      begin
        if(tu.strip_customer_id.present?)
          res = charge_customer(tu, 50, "Escrow Payment", 'usd')
        else
          tu.update_column 'strip_customer_id', create_customer(tu.email, params[:tour_user][:card_token]).id
          res = charge_customer(tu, 50, "Escrow Payment", 'usd')
        end

        sleep 2
        pay_back = refund_customer(tu, res[:id])
               
      rescue Exception => e
        flash[:error] = e.message

      end

      new_tour = SchedualTour.find(params[:sched_tour_id])

      unless new_tour.present?
        new_tour = SchedualTour.create!(community_id: params[:community_id], user_time_zone: params[:user_time_zone], tour_user_id: tu.id)
        new_tour.save
      end

      schedual_tour = MaxDateScheduledTourService.new(tu, community, true).get_scheduled_tour
      
      if schedual_tour.present?
        new_tour.update(stops_list: schedual_tour.stops_list)
      else
        scheduled_tours = community.schedual_tours.where(tour_user_id: tu.id)
        
        if scheduled_tours.present?
          new_tour.update(stops_list: scheduled_tours.last.stops_list)
        end
      end

      schedual_tour = (schedual_tour.present? && !schedual_tour.is_tour_completed) ? schedual_tour : new_tour

      previous_tour = {
        tour_date: schedual_tour.tour_date,
        tour_time: schedual_tour.tour_time,
        is_rescheduled: schedual_tour.tour_user_id.present?
      }
      
      if params[:desired_move_in_date].present?
        date = params[:desired_move_in_date].split('/')
        date[0],date[1] = date[1],date[0]
        date = date.join('-').to_date
        desired_move_in_date = date
      else
        desired_move_in_date = ""
      end

      is_rescheduled = false
      tour_type = params["tour_type"].present? ? params["tour_type"] : ""
      property_tour_type = params['tour_user']['property_tour_type'] if (params['tour_user'] && params['tour_user']['property_tour_type']).present? 
      knock_prospect_ip = Rails.env.development? ? "127.0.0.0" : (request.ip || request.remote_ip)
      
      schedual_tour.update_attributes(knock_prospect_ip_address: knock_prospect_ip, tour_date: new_tour.tour_date, tour_time: new_tour.tour_time,property_tour_type: property_tour_type,tour_type: tour_type,tour_user_id: tu.id,charge_id: res.present? ? res[:id] : nil, pay_back_id: pay_back.present? ? pay_back.refund_id : nil, desired_move_in_date: desired_move_in_date, desired_bedroom: params[:desired_bedroom],user_time_zone: params[:user_time_zone],country_code: params[:country_code], realpage_marketing_source: realpage_marketing_source.present? ? realpage_marketing_source : "")

      # Update funnel discovery source
      schedual_tour.update_attributes(funnel_prospect_discover_source: params[:funnel_prospect_discover_source]) if community.is_funnel_community? && params[:funnel_prospect_discover_source].present?
      
      if previous_tour[:is_rescheduled]
        is_rescheduled = true
        new_tour.delete
      end

      if community&.credential&.rentcafe_api_version == "RentCafe V2"
        YardiRentCafeV2Services::MarketingApisV2Service.new(schedual_tour).schedule_tour(previous_tour)
      else
        YardiRentCafeServices::MarketingApisService.new(schedual_tour).schedule_tour(previous_tour)
      end
      
      KnockService.new(schedual_tour).knock_crm(is_rescheduled)
      FunnelService.new(schedual_tour).funnel_crm(is_rescheduled)

      appointment_time = (schedual_tour.tour_date.to_s +  " " + schedual_tour.tour_time.to_s.split(' ')[1]).to_datetime if schedual_tour.tour_date.present? and schedual_tour.tour_time.present?
      marketing_source = params[:marketing_source].present? ? params[:marketing_source] : "" rescue  ""
      community.realpage_insert_prospect(tu, appointment_time, marketing_source, desired_move_in_date) if community.present? and community.data_provider == "realpagesvc" # sending 'desired_move_in_date' for the parameter 'tour_time'

      begin
        sent_notifications = send_email_and_other_notifications(schedual_tour, previous_tour, is_rescheduled, property_tour_type)
        redirect_to scheduler_widget_test_widget_path(message: sent_notifications[:web_notification], community_id: community.id, property_tour_type: property_tour_type, tour_type: tour_type)
      rescue Exception => e
        AccessLogsService.new().scheduler_widget_logs(community.id, params, e)
        redirect_to scheduler_widget_test_widget_path(message: sent_notifications[:web_notification], community_id: community.id, property_tour_type: property_tour_type, tour_type: tour_type)
      end
    else
      render json: {message: "some errors occured"}, status: 'failed'
    end
  end

  # POST /schedual_tours
  # POST /schedual_tours.json
  def create
    date = DateTime.strptime(params[:tour_time], '%m/%d/%Y %l:%M %p')

    tour_time, day_diff = get_tour_datetime_and_diff date
    
    community = Community.find params[:community_id]
    @stepping = community.community_tour.tour_setting.time_intervel == '15 min' ? 15 : (@community.community_tour.tour_setting.time_intervel == '30 min' ? 30 : (@community.community_tour.tour_setting.time_intervel == '1 hr') ? 60 : (@community.community_tour.tour_setting.time_intervel == '2 hrs') ? 120 : 15) rescue 15
    @stepping = @stepping - 1
    
    before_30_mints = tour_time.to_time - @stepping.minutes
    after_30_mints = tour_time.to_time + @stepping.minutes

    before_30_mints, c = get_tour_datetime_and_diff before_30_mints
    after_30_mints, d = get_tour_datetime_and_diff after_30_mints

    total_count = community.schedual_tours.where(tour_date: date, tour_time: before_30_mints..after_30_mints).where.not(tour_user_id: nil,tour_type: "virtual_tour").count
    total_count_per_day = community.schedual_tours.where(tour_date: date).where.not(tour_user_id: nil,tour_type: "virtual_tour").count
    
    self_tour_count = community.schedual_tours.where(tour_date: date, tour_time: before_30_mints..after_30_mints,tour_type: "self_tour").where.not(tour_user_id: nil).count
    guided_count = community.schedual_tours.where(tour_date: date, tour_time: before_30_mints..after_30_mints,tour_type: "guided_tour").where.not(tour_user_id: nil).count
  
    in_limit_count, error_message, limit_type = check_limit(params[:tour_type], total_count,total_count_per_day,self_tour_count,guided_count,  @community)
    @show_tour_modal, @type_list, error = show_tour_type_modal(params[:show_self_tour_option], params[:show_guided_tour_option], in_limit_count, @community, limit_type, params[:error])

    @schedual_tour = SchedualTour.new(tour_date: date, tour_time: tour_time, end_time: after_30_mints, community_id: params[:community_id], user_time_zone: params[:user_time_zone], day_diff: day_diff)
    axisting_tour_users = scheduled_tour_users community

     unless @type_list == []
      respond_to do |format|
        if @schedual_tour.save
          format.html { redirect_to @schedual_tour, notice: 'Schedual tour was successfully created.' }
          format.json { render  json: {axisting_tour_users: axisting_tour_users, schedual_tour: @schedual_tour, show_tour_type_modal: @show_tour_modal, type_list: @type_list, in_limit_count: in_limit_count} }
        else
          format.html { render :new }
          format.json { render json: @schedual_tour.errors, status: :unprocessable_entity }
        end
      end
      else
        error = "No tour found for this community." unless error.present?
      render json: {message: error, code: "400" }
    end
  end

  def get_funnel_available_times
    day = params[:date].gsub("/", "-")
    scheduled_tour = SchedualTour.find_by_id(params[:schedule_tour_id])
    response = FunnelService.new(scheduled_tour).get_available_times(day)
    response = response.map { |date| date.to_datetime.strftime("%I:%M %P")  }

    render json: {data: response, status: :OK, code: 200}, layout: false

  end

  def get_tour_type
    community = Community.find params[:community_id]
    @stepping = community.community_tour.tour_setting.time_intervel == '15 min' ? 15 : (@community.community_tour.tour_setting.time_intervel == '30 min' ? 30 : (@community.community_tour.tour_setting.time_intervel == '1 hr') ? 60 : (@community.community_tour.tour_setting.time_intervel == '2 hrs') ? 120 : 15) rescue 15
    @stepping = @stepping - 1

    @use_yardi_as_lead = @community.use_yardi_as_lead?
    @is_knock_community = @community.is_knock_community?

    date_time = params[:date] + " " +params[:time]
    date = DateTime.strptime(date_time, '%m/%d/%Y %l:%M %p')
    
    tour_time, day_diff = get_tour_datetime_and_diff date
    before_30_mints = tour_time.to_time - @stepping.minutes
    after_30_mints = tour_time.to_time + @stepping.minutes

    before_30_mints, c = get_tour_datetime_and_diff before_30_mints
    after_30_mints, d = get_tour_datetime_and_diff after_30_mints

    total_count = community.schedual_tours.where(tour_date: date, tour_time: before_30_mints..after_30_mints).where.not(tour_user_id: nil,tour_type: "virtual_tour").count
    total_count_per_day = community.schedual_tours.where(tour_date: date).where.not(tour_user_id: nil,tour_type: "virtual_tour").count
    
    self_tour_count = community.schedual_tours.where(tour_date: date, tour_time: before_30_mints..after_30_mints,tour_type: "self_tour").where.not(tour_user_id: nil).count
    guided_count = community.schedual_tours.where(tour_date: date, tour_time: before_30_mints..after_30_mints,tour_type: "guided_tour").where.not(tour_user_id: nil).count
    limit_exceded_tour_types = check_limit(params[:tour_type], total_count,total_count_per_day,self_tour_count,guided_count,  @community)

    if params.has_key?("schedual_tour_id") && params["schedual_tour_id"].present?
      @schedual_tour = SchedualTour.find(params["schedual_tour_id"])
      @schedual_tour.update(tour_date: date, tour_time: tour_time, end_time: after_30_mints, day_diff: day_diff)
    else
      @schedual_tour = SchedualTour.new(tour_date: date, tour_time: tour_time, end_time: after_30_mints, community_id: params[:community_id], user_time_zone: params[:user_time_zone], day_diff: day_diff)
      @schedual_tour.save
    end

    tour_types = []

    unless community.is_funnel_community?
      if @is_knock_community 
        tour_types = KnockService.new(@schedual_tour).knock_available_tour_types( params[:date], params[:day], params[:time])
      elsif @use_yardi_as_lead
        tour_types = (community.fetch_tour_type_according_to_time_for_yardi(@schedual_tour, date.strftime("%-m/%-e/%Y"), params[:time]))
      else
        tour_types = (community.fetch_tour_type_according_to_time(params[:day], params[:time]))
      end

      tour_types = (community.fetch_tour_type_according_to_time(params[:day], params[:time])) if tour_types.empty?
    else
      tour_types =  community_allowed_tour_types(community)
    end

    render json: {tour_types: remove_occupied_tour_types(tour_types, limit_exceded_tour_types), schedual_tour_id: @schedual_tour.id, stats: :OK, code: 200}, layout: false
  end

  def remove_occupied_tour_types available_types, occupied_types

    available_types = available_types.map{|type| type[0]} - occupied_types
    types = []

    available_types.each do |type|
      if type == "self_tour"
        types << ["self_tour", "Self Tour"]
      elsif type == "guided_tour"
        types << ["guided_tour", "Guided Tour"]
      end
    end

    types
  end

  def show_tour_type_modal(show_self_tour_option, show_guided_tour_option, in_limit, community, limit_type, error)
    
    if(show_self_tour_option == "false" && show_guided_tour_option == "false")
      return false , remove_array( [["Virtual Tour","virtual_tour"]] ,community,limit_type), error
    elsif (show_self_tour_option == "true" && show_guided_tour_option == "false")
      unless (limit_type.include? "total") || (limit_type.include? "self_tour")
        return true , remove_array([["Self Tour","self_tour"], ["Virtual Tour","virtual_tour"]], community,limit_type), "Max tour users limit reached for the selected time"
      else
        return false , remove_array([["Virtual Tour","virtual_tour"]], community,limit_type), "Max tour users limit reached for the selected time"
      end
    elsif (show_self_tour_option == "false" && show_guided_tour_option == "true")
      unless (limit_type.include? "total") || (limit_type.include? "guided_tour")
        return true , remove_array([["Virtual Tour","virtual_tour"],["Guided Tour","guided_tour"]], community,limit_type), "Max tour users limit reached for the selected time"
      else
        return false , remove_array([["Virtual Tour","virtual_tour"]], community,limit_type), "Max tour users limit reached for the selected time"
      end
    else
      if (limit_type.include?  "total")
        return true , remove_array([["Virtual Tour","virtual_tour"]], community,limit_type), "Max tour users limit reached for the selected time"
      else
        return true , remove_array([["Self Tour","self_tour"],["Virtual Tour","virtual_tour"],["Guided Tour","guided_tour"]], community,limit_type), "Max tour users limit reached for the selected time"
      end
        
    end
  end

  def remove_array(arr, community, limit_type)
    if (!community.community_tour.tour_setting.allow_virtual_tour)
      arr = arr - [["Virtual Tour","virtual_tour"]]
    end

    if (!community.community_tour.tour_setting.allow_guided_tour || (limit_type.include? "guided_tour"))
      arr = arr - [["Guided Tour","guided_tour"]]
    end

    if (!community.community_tour.tour_setting.allow_self_tour || (limit_type.include? "self_tour"))
      arr = arr - [["Self Tour","self_tour"]]
    end
    
    return arr
  end

  def check_limit(tour_type, total_count,total_count_per_day,self_tour_count,guided_count, community )
    
    limit_type = []

    if (community.community_tour.tour_setting.do_limit_max_tour && community.community_tour.tour_setting.limit_max_tour.present? && total_count >= community.community_tour.tour_setting.limit_max_tour.to_i)
      limit_type << "virtual_tour"
    end

    if community.community_tour.tour_setting.do_limit_max_tour && community.community_tour.max_self_tour_users.present? && community.community_tour.max_self_tour_users.present? && !(self_tour_count < community.community_tour.max_self_tour_users.to_i)
      limit_type << "self_tour"
    end

    if community.community_tour.tour_setting.do_limit_max_tour && community.community_tour.max_guided_tour_users.present? && community.community_tour.max_guided_tour_users.present? && !(guided_count < community.community_tour.max_guided_tour_users.to_i)
      limit_type << "guided_tour"
    end

    return limit_type
  end

  def update
    tu = @schedual_tour.tour_user
    tu.is_sms_enabled = params[:tour_user][:is_sms_enabled] == "0" ? false : true
    date = Date.strptime(params[:tour_date], '%m/%d/%Y') if params[:tour_date].is_a? String
    time = Time.zone.parse(params[:tour_time]) if params[:tour_time].is_a? String
    date_time = DateTime.new(date.year, date.month, date.day, time.hour, time.min).strftime('%m/%d/%Y %l:%M %p')

    date = DateTime.strptime(date_time, '%m/%d/%Y %l:%M %p')
    tour_time, day_diff = get_tour_datetime_and_diff date

    previous_tour = {
      tour_date: @schedual_tour.tour_date,
      tour_time: @schedual_tour.tour_time,
    }



    # Update funnel discovery source
    @schedual_tour.update_attributes(funnel_prospect_discover_source: params[:funnel_prospect_discover_source]) if @schedual_tour.community.is_funnel_community? && params[:funnel_prospect_discover_source].present?
    
    if @schedual_tour&.community&.credential&.rentcafe_api_version == "RentCafe V2"
      YardiRentCafeV2Services::MarketingApisV2Service.new(@schedual_tour).schedule_tour(previous_tour)
    else
      YardiRentCafeServices::MarketingApisService.new(@schedual_tour).schedule_tour(previous_tour)
    end

    KnockService.new(@schedual_tour).knock_crm(true)
    FunnelService.new(@schedual_tour).funnel_crm(true)

    @schedual_tour.update_attributes(tour_date: date, tour_time: tour_time, day_diff: day_diff)
    
    set_daily_email_sent = false
    set_daily_email_sent = true if day_diff >= 1
    @schedual_tour.update_attributes(hourly_email_sent: false, daily_email_sent: set_daily_email_sent)
    tu = @schedual_tour.tour_user
    respond_to do |format|
      if @schedual_tour.save 
        begin
          property_tour_type = @schedual_tour.property_tour_type.present? ? @schedual_tour.property_tour_type : "scheduled_tour"
          sent_notifications = send_email_and_other_notifications(@schedual_tour, previous_tour, true, property_tour_type)
    
        rescue Exception => e
        end
        msg = { :status => "ok", :message => sent_notifications[:web_notification] }
        format.json  { render :json => msg }
      else
        format.html { render :new }
        format.json { render json: @schedual_tour.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /schedual_tours/1
  # DELETE /schedual_tours/1.json
  def destroy
    if params[:delete_type].present? && params[:delete_type] == "page"
      schedual_tour = SchedualTour.find params[:id]
      schedual_tour.destroy
      redirect_to community_schedual_tours_path(@community), notice: 'Scheduled tour is successfully deleted'
    else
      @schedual_tour.destroy

      respond_to do |format|
        if user_signed_in?
          flash[:notice] = 'Scheduled tour is successfully deleted'
          format.html { redirect_to community_schedual_tours_path(@community) }
          format.json { render :json => {logged_in: true} }
        else
          flash[:notice] = 'Scheduled tour is successfully deleted'
          format.html { redirect_to schedual_tours_url }
          format.json { render :json => {logged_in: false} }
        end        
      end
    end
  end

  private

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


    def scheduled_tour_users community
      scheduled_tours = SchedualTour.where(community_id: community.id).where.not(tour_user_id: nil)
      tour_user_ids = scheduled_tours_in_future(scheduled_tours, community)
      TourUser.where(id: tour_user_ids).pluck(:email).uniq
    end

    def scheduled_tours_in_future(scheduled_tours, community, tour_user_ids = [], community_time_zone = nil)
      community_time_zone = community.get_time_zone()
      scheduled_tours.find_each do |tour|
        unless tour.is_tour_completed
          is_in_timezone = (tour.tour_date.to_s + " " + tour.tour_time.strftime("%I:%M%p")).in_time_zone(community_time_zone) > Time.now.in_time_zone(community_time_zone)
          tour_user_ids << tour.tour_user_id if is_in_timezone
        end
      end
    
      tour_user_ids
    end

    def get_tour_datetime_and_diff date
      tour_date = Date.strptime(date.in_time_zone(params[:user_time_zone]).strftime("%m/%d/%Y"), "%m/%d/%Y")
      server_current_date = Date.strptime(DateTime.current.in_time_zone(params[:user_time_zone]).strftime("%m/%d/%Y"), "%m/%d/%Y")
      tour_time = date.strftime("%l:%M %p")
      day_diff = (tour_date - server_current_date).to_i

      [tour_time, day_diff]
    end

    def send_email_and_other_notifications(schedual_tour,previous_tour,is_rescheduled,property_tour_type)
      tu = schedual_tour.tour_user
      community = schedual_tour.community
      community_email = community.email.present? ? community.email : 'info@pynwheel.com'
      @community_opening_hours = community.opening_hours.order(:sort).all
      time_slot ||= []
      slot_str = ""
      sms_slot_str = ""
      @community_opening_hours.each do |slot|
        time_slot << {"#{slot.day[0..2]}": "#{Time.zone.parse(slot.opening_time).strftime("%I:%M%p")} - #{Time.zone.parse(slot.closing_time).strftime("%I:%M%p")}"}
      end

      merged_slots = time_slot.each_with_object({}) { |h, o| h.each { |k,v| (o[k] ||= []) << v } }
      merged_slots.each do |k,v|
        slot_str += "<b>#{k}:</b> #{v.join(' and ')}#{merged_slots.keys.last == k ? "" : ", "}"
        sms_slot_str += "#{k}: #{v.join(' and ')}#{merged_slots.keys.last == k ? "" : "\n"}"
      end

      puts "<<<<<<<<<<<<<<<<<<<<<<<<<<<#{params}---"
      app_link = (Company.find community.company_id).name.downcase == "lincoln" ? "http://onelink.to/6fsxvq" : "http://onelink.to/m5vuhn"
      android_link = (Company.find community.company_id).name.downcase == "lincoln" ? "http://onelink.to/6fsxvq" : "http://onelink.to/m5vuhn"
      
      app_link_web = (Company.find community.company_id).name.downcase == "lincoln" ? "https://apps.apple.com/us/app/lincoln-property-self-tour/id1508997129" : "https://apps.apple.com/us/app/self-tour/id1488907392"
      android_link_web = (Company.find community.company_id).name.downcase == "lincoln" ? "https://play.google.com/store/apps/details?id=com.pynwheel.lincolnselftour" : "https://play.google.com/store/apps/details?id=com.pynwheel.selftour"
      previous_text = ""

        if community.community_tour.tour_setting.enable_header_footer
          if previous_tour[:tour_date].present? && previous_tour[:tour_time].present?
            previous_text = "instead of <b>#{previous_tour[:tour_date].strftime("%A, %b %-d, %Y")}</b> at <b>#{ Time.parse(previous_tour[:tour_time].to_s).strftime("%-I:%M %P")}</b>."
          end
          email_content = (property_tour_type == "scheduled_tour" && is_rescheduled) ? "<div style='vertical-align:middle; text-align:center'><p style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px;'>Thank you <b>#{tu.name}</b> for rescheduling your tour! We look forward to having you at <b>#{community.name if community.present?}</b> on <b>#{schedual_tour.tour_date.strftime("%A, %b %-d, %Y")}</b> at <b>#{ Time.parse(schedual_tour.tour_time.to_s).strftime("%-I:%M %P")}</b> #{previous_text} When you go to the property, you will need: <br/></p> </div> <ul><li style='font-size: 16px; text-align: left; line-height: 22px; margin-bottom: 10px;'>A photo ID</li> <li style='font-size: 16px; text-align: left; line-height: 22px; margin-bottom: 10px;'>Your mobile device with the Pynwheel Self Tour app installed.</li></ul> <div style='vertical-align:middle; text-align:center'><p style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px;'><br>#{community.email_text.gsub("\n", "<br>").html_safe rescue ""}<br><b>Please download Self Tour app before you arrive:</b></div>" : 
          if property_tour_type == "unscheduled_self_tour"
            "<div style='vertical-align:middle; text-align:center;'><p class='mt-10' style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px;'> Thank you, <b>#{tu.name}</b> We look forward to having you at <b>#{community.name if community.present?}!</b> Our visiting hours are:</p>
            <p style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px;padding-right: 8%;padding-left: 5%'>#{slot_str}</p><p style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px;'>When you go to the property, you will need a <b>photo ID</b> and a <b>mobile device</b> with the Pynwheel Self Tour app.</p><div style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px;'><b>Please download the Pynwheel Self Tour app before you arrive:</b></p></div>"
          elsif property_tour_type == "remote_tour"
            "<div style='vertical-align:middle; text-align:center'><p class='mt-10' style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px; '> Thank you <b>#{tu.name}</b> for choosing to tour <b>#{community.name if community.present?}</b> remotely! You can visit at any time from the comfort of your own home using our mobile app.</p><p style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px;'><b>Please download the Pynwheel Self Tour app before you arrive:</b></p></div>"
          else 
            "<div style='vertical-align:middle; text-align:center'><p style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px;'> Thank you <b>#{tu.name}</b> for scheduling your tour! We look forward to having you at <b>#{community.name if community.present?}</b> on  <b>#{schedual_tour.tour_date.strftime("%A, %b %-d, %Y")}</b> at <b>#{ Time.parse(schedual_tour.tour_time.to_s).strftime("%-I:%M %P")}</b>. When you go to the property, you will need: <br/></p></div> <ul><li style='font-size: 16px; text-align: left; line-height: 22px; margin-bottom: 10px;'>A photo ID</li><li style='font-size: 16px; text-align: left; line-height: 22px; margin-bottom: 10px;'>Your mobile device with the Pynwheel Self Tour app installed.</li></ul><div style='vertical-align:middle; text-align:center'><p style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px;'><br>#{community.email_text.gsub("\n", "<br>").html_safe rescue ""}<br><br><b>Please download Self Tour app before you arrive:</b></div>"
          end
        else
          if previous_tour[:tour_date].present? && previous_tour[:tour_time].present?
            previous_text = "instead of <b>#{previous_tour[:tour_date].strftime("%A, %b %-d, %Y")}</b> at <b>#{ Time.parse(previous_tour[:tour_time].to_s).strftime("%-I:%M %P")}</b>."
          end
          email_content = (property_tour_type == "scheduled_tour" && is_rescheduled) ? "<div style='vertical-align:middle; text-align:center'><img style='#{logo_style}' align='center' border='0' width='200' src='#{community.logo_for_email}' data-title='#{community.name}' /><p style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px;'><br/><p class='mt-10' style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px;'>Thank you for rescheduling your tour! We look forward to having you at <b>#{community.name if community.present?}</b> on <b>#{schedual_tour.tour_date.strftime("%A, %b %-d, %Y")}</b> at <b>#{ Time.parse(schedual_tour.tour_time.to_s).strftime("%-I:%M %P")}</b> #{previous_text} When you go to the property, you will need: </p></div> <ul><li style='font-size: 16px; text-align: left; line-height: 22px; margin-bottom: 10px;'>A photo ID</li> <li style='font-size: 16px; text-align: left; line-height: 22px; margin-bottom: 10px;'>Your mobile device with the Pynwheel Self Tour app installed.</li></ul><div style='font-size: 18px;text-align:center'><br>#{community.email_text.gsub("\n", "<br>").html_safe rescue ""}<br><br>Please download Self Tour app before you arrive: <br>iPhone Users: <a href=#{app_link} target='_blank'>Download Pynwheel Self Tour from the App Store</a><br>Android Users: <a href=#{android_link} target='_blank'>Download Pynwheel Self Tour from Google Play</a><br></div>" : 
          if property_tour_type == "unscheduled_self_tour"
            "<div style='vertical-align:middle; text-align:center;'><img style='#{logo_style}' align='center' border='0' width='200' src='#{community.logo_for_email}' data-title='#{community.name}' /><br/><p class='mt-10' style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px;'> We look forward to having you at <b>#{community.name if community.present?}!</b> Our visiting hours are:<br/>#{slot_str}<br/>When you go to the property, you will need a <b>photo ID</b> and a <b>mobile device</b> with the Pynwheel Self Tour app.</p></div><div style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px;'><b>Please download the Pynwheel Self Tour app before you arrive:</b></p></div>"
          elsif property_tour_type == "remote_tour"
            "<div style='vertical-align:middle; text-align:center'><img style='#{logo_style}' align='center' border='0' width='200' src='#{community.logo_for_email}' data-title='#{community.name}' /><br/><p class='mt-10' style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px;'> Thank you <b>#{tu.name}</b> for choosing to tour <b>#{community.name if community.present?}</b> remotely! You can visit at any time from the comfort of your own home using our mobile app.</p><p style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px; '><b>Please download the Pynwheel Self Tour app before you arrive:</b></p></div>"
          else
            "<div style='vertical-align:middle; text-align:center'><img style='#{logo_style}' align='center' border='0' width='200' src='#{community.logo_for_email}' data-title='#{community.name}' /><br/><p style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px;'>Thank you <b>#{tu.name}</b> for scheduling your tour! We look forward to having you at <b>#{community.name if community.present?}</b> on <b>#{schedual_tour.tour_date.strftime("%A, %b %-d, %Y")}</b> at <b>#{ Time.parse(schedual_tour.tour_time.to_s).strftime("%-I:%M %P")}</b>. When you go to the property, you will need: </p></div> <br/> <ul><li style='font-size: 16px; text-align: left; line-height: 22px; margin-bottom: 10px;'>A photo ID</li> <li style='font-size: 16px; text-align: left; line-height: 22px; margin-bottom: 10px;'>Your mobile device with the Pynwheel Self Tour app installed.</li></ul><div style='font-size: 18px;text-align:center'><br>#{community.email_text.gsub("\n", "<br>").html_safe rescue ""}<br><br>Please download Self Tour app before you arrive: <br>iPhone Users: <a href=#{app_link} target='_blank'>Download Pynwheel Self Tour from the App Store</a><br>Android Users: <a href=#{android_link} target='_blank'>Download Pynwheel Self Tour from Google Play</a><br></div><br/>"
          end
        end
      community_text = (Company.find community.company_id).name.downcase == "lincoln" ? "Lincoln Property Company Self Tour" : "Pynwheel Self Tour"
      if previous_tour[:tour_date].present? && previous_tour[:tour_time].present?
        previous_text = "instead of <b>#{previous_tour[:tour_date].strftime("%A, %b %-d, %Y")}</b> <br/> at <b>#{ Time.parse(previous_tour[:tour_time].to_s).strftime("%-I:%M %P")}</b>."
      end

      web_notification = (property_tour_type == "scheduled_tour" && is_rescheduled) ? "<div style='vertical-align:middle; text-align:center;'><img style='#{logo_style}' align='center' border='0' width='200' src='#{community.logo_for_email}' data-title='#{community.name}' /><br/><p class='mt-10' style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px; font-family: arial, helvetica, sans-serif;'>Thank you, <b>#{tu.name}</b> Your reservation is rescheduled. We look forward to having you at <b>#{community.name if community.present?}</b> on <b>#{schedual_tour.tour_date.strftime("%A, %b %-d, %Y")}</b> at <b>#{ Time.parse(schedual_tour.tour_time.to_s).strftime("%-I:%M %P")}</b> #{previous_text} Please keep an eye out for texts and emails with further instructions.</p><p style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px; font-family: arial, helvetica, sans-serif;'><b>Please download the Pynwheel Self Tour app before you arrive:</b></p></div>" : 
      if property_tour_type == "unscheduled_self_tour"
        "<div style='vertical-align:middle; text-align:center;'><img style='#{logo_style}' align='center' border='0' width='200' src='#{community.logo_for_email}' data-title='#{community.name}' /><br/><p class='mt-10' style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px; font-family: arial, helvetica, sans-serif;'> Thank you, <b>#{tu.name}</b> We look forward to having you at <b>#{community.name if community.present?}!</b> Our visiting hours are:</p><p style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px;font-family: arial, helvetica, sans-serif !important; padding-right: 8%;padding-left: 5%'>#{slot_str}</p><p style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px;font-family: arial, helvetica, sans-serif !important;'>When you go to the property, you will need a <b>photo ID</b> and a <b>mobile device</b> with the Pynwheel Self Tour app.</p></div><div style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px;font-family: arial, helvetica, sans-serif !important;'><b>Please download the Pynwheel Self Tour app before you arrive:</b></p></div>"
      elsif property_tour_type == "remote_tour"
        "<div style='vertical-align:middle; text-align:center'><img style='#{logo_style}' align='center' border='0' width='200' src='#{community.logo_for_email}' data-title='#{community.name}' /><br/><p class='mt-10' style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px; font-family: arial, helvetica, sans-serif;'> Thank you, <b>#{tu.name}</b> for choosing to tour <b>#{community.name if community.present?}</b> remotely! You can visit at any time from the comfort of your own home using our mobile app.</p><p style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px; font-family: arial, helvetica, sans-serif;'><b>Please download the Pynwheel Self Tour app before you arrive:</b></p></div>"
      else
        "<div style='vertical-align:middle; text-align:center'><img style='#{logo_style}' align='center' border='0' width='200' src='#{community.logo_for_email}' data-title='#{community.name}' /><br/><p class='mt-10' style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px; font-family: arial, helvetica, sans-serif;'> Thank you, <b>#{tu.name}</b> Your reservation is confirmed. We look forward to having you at <b>#{community.name if community.present?}</b> on <b>#{schedual_tour.tour_date.strftime("%A, %b %-d, %Y")}</b> <br/>at <b>#{ Time.parse(schedual_tour.tour_time.to_s).strftime("%-I:%M %P")}</b>. Please keep an eye out for texts and emails with further instructions. </p><p style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px; font-family: arial, helvetica, sans-serif;'><b>Please download the Pynwheel Self Tour app before you arrive:</b></p></div>"
      end 
      confirmation_page_link = "#{root_url}scheduler_widget/confirmation_instructions?community_id=#{community.id}&schedual_tour=#{schedual_tour.id}&reschedule=#{is_rescheduled}"
      
      if previous_tour[:tour_date].present? && previous_tour[:tour_time].present?
        previous_text = "instead of #{previous_tour[:tour_date].strftime("%A, %b %-d, %Y")} at #{ Time.parse(previous_tour[:tour_time].to_s).strftime("%-I:%M %P")}.#{"\n"}"
      end

      (is_rescheduled && property_tour_type == "scheduled_tour") ? schedual_tour.update_attributes(reschedule_notification: web_notification) : schedual_tour.update_attributes(confirmation_notification: web_notification)
      sms_content = (is_rescheduled && property_tour_type == "scheduled_tour") ? 
      "Thank you for rescheduling your tour! We look forward to having you at #{community.name if community.present?} on #{schedual_tour.tour_date.strftime("%A, %b %-d %Y")} at #{ Time.parse(schedual_tour.tour_time.to_s).strftime("%-I:%M %P")} #{previous_text} When you go to the property, you will need: 
      - A photo ID 
      - Your mobile device with the #{community_text} app installed#{"\n"}
#{community.email_text}#{"\n"}
Download #{community_text} #{app_link}#{"\n"}
#{community.email_text}#{"\n"}
Get information about your tour here: #{confirmation_page_link}" :

      if property_tour_type == "unscheduled_self_tour"
        "We look forward to having you at #{community.name if community.present?} ! Our visiting hours are:
#{sms_slot_str} #{"\n"} #{"\n"} When you go to the property, you will need:
            - A photo ID
            - Your mobile device with the #{community_text} app installed#{"\n"}
#{community.email_text}#{"\n"}
Download #{community_text} #{app_link}#{"\n"}
Get information about your tour here: #{confirmation_page_link}"
      elsif property_tour_type == "remote_tour"
        "Thank you for choosing to tour #{community.name if community.present?} remotely! You can visit at any time from the comfort of your own home using our mobile app.#{"\n"}
#{community.email_text}#{"\n"}
Download #{community_text} #{app_link}#{"\n"}
Get information about your tour here: #{confirmation_page_link}"

      else
        "Thank you for scheduling your tour! We look forward to having you at #{community.name if community.present?} on #{schedual_tour.tour_date.strftime("%A, %b %-d %Y")} at #{ Time.parse(schedual_tour.tour_time.to_s).strftime("%-I:%M %P")}.#{"\n"}When you go to the property, you will need: 
        - A photo ID
        - Your mobile device with the #{community_text} app installed#{"\n"}
#{community.email_text}#{"\n"}
Download #{community_text} #{app_link}#{"\n"}
Get information about your tour here: #{confirmation_page_link}"
      end

      if previous_tour[:tour_date].present? && previous_tour[:tour_time].present?
        previous_text = "from  <b>#{previous_tour[:tour_date].strftime("%A, %b %-d, %Y")}</b> at <b>#{ Time.parse(previous_tour[:tour_time].to_s).strftime("%-I:%M %P")}</b> to <b> "
      else
        previous_text = "</b> at <b>"
      end

      community_mail = is_rescheduled && property_tour_type == "scheduled_tour" && (schedual_tour.tour_type == "self_tour" ||  schedual_tour.tour_type == "guided_tour" ) ? "<div style='vertical-align:middle; text-align:center'><img style='#{logo_style}' align='center' border='0' width='200' src='#{community.logo_for_email}' data-title='#{community.name.humanize}' /></div><br/>
      Someone has rescheduled a #{property_tour_type == "scheduled_tour" ? schedual_tour.tour_type.split('_').map(&:capitalize).join(' ') : property_tour_type.split('_').map(&:capitalize).join(' ')} at your property <b>#{community.name if community.present?}</b> #{previous_text} #{schedual_tour.tour_date.strftime("%A, %b %-d, %Y")}</b> at<b>#{ Time.parse(schedual_tour.tour_time.to_s).strftime("%-I:%M %P")}</b>. <br>Name: #{tu.name}<br>Date: #{schedual_tour.tour_date.strftime("%m %d %Y")}<br>Time: #{Time.parse(schedual_tour.tour_time.to_s).strftime("%I:%M %P")}<br>Email: #{tu.email}<br>Phone: #{tu.phone_number}" : 
      "<div style='vertical-align:middle; text-align:center'><img style='#{logo_style}' align='center' border='0' width='200' src='#{community.logo_for_email}' data-title='#{community.name.humanize}' /></div><br/>Someone has scheduled a #{property_tour_type == "scheduled_tour" ? schedual_tour.tour_type.split('_').map(&:capitalize).join(' ') : property_tour_type.split('_').map(&:capitalize).join(' ')} at your property <b>#{community.name if community.present?}</b>. <br>Name: #{tu.name}<br>Date: #{schedual_tour.tour_date.present? ? schedual_tour.tour_date.strftime("%m %d %Y") : schedual_tour.created_at.strftime("%m %d %Y") }<br>Time: #{Time.parse(schedual_tour.tour_time.present? ? schedual_tour.tour_time.to_s : schedual_tour.created_at.to_s).strftime("%I:%M %P")}<br>Email: #{tu.email}<br>Phone: #{tu.phone_number}"

      emails = community_email.gsub(" ","").split(',')
      subject1 =  email_subject(is_rescheduled,property_tour_type,schedual_tour,false) 
      subject2 =  email_subject(is_rescheduled,property_tour_type,schedual_tour,true) 
      ScheduledTourMailerJob.perform_async(subject1, email_content, tu.email,community,nil,nil,nil,emails[0],true,schedual_tour)if (community.alert_contact == "email" || community.alert_contact == "both")
      
      unless tu.is_virtual_tour?
        emails.each do |email|
          ScheduledTourMailerJob.perform_async(subject2,community_mail,email,community,nil,nil,nil,INFO_EMAIL,false,schedual_tour)if (community.alert_contact == "email" || community.alert_contact == "both" || community.alert_contact == "phone")
        end
      end

      sms_notifire(sms_content, schedual_tour&.tour_user&.phone_number, tu&.email, community&.id) if (schedual_tour.tour_user.is_sms_enabled && (community.alert_contact == "phone" || community.alert_contact == "both")) rescue nil

      {email_content: email_content, web_notification: web_notification, sms_content: sms_content}
      
    end


    def email_subject(is_rescheduled,property_tour_type,schedual_tour,community_mail)
      if is_rescheduled && property_tour_type == "scheduled_tour" && schedual_tour.tour_type == "self_tour"
        community_mail ? "A Self Tour has been rescheduled!" : "Tour has been rescheduled"
      elsif property_tour_type == "unscheduled_self_tour"
        community_mail ? "Unscheduled Self Tour has been confirmed!" : "Tour has been confirmed"
      elsif property_tour_type == "remote_tour"
        community_mail ? "Virtual Tour has been confirmed!" : "Remote Tour has been confirmed"
      elsif !is_rescheduled && property_tour_type == "scheduled_tour" && schedual_tour.tour_type == "guided_tour"
        community_mail ? "A Guided Tour has been scheduled!" : "Guided Tour has been scheduled"
      elsif is_rescheduled && property_tour_type == "scheduled_tour" && schedual_tour.tour_type == "guided_tour"
        community_mail ? "A Guided Tour has been rescheduled!" : "Guided Tour has been rescheduled"
      else
        community_mail ? "A Self Tour has been scheduled!" : "Tour has been scheduled"
      end
    end

    # TODO not being used, remove it maybe
    def calculate_seconds_one_day_prior_for_delayed_email schedual_tour
      
      date = schedual_tour.tour_date
      time = schedual_tour.tour_time

      total_days = ((date.to_date - Time.zone.now.to_date)).to_i
      dt = get_date_time_combined date, time
      
      total_minutes = TimeDifference.between(dt, DateTime.now.strftime('%a, %d %b %Y %H:%M:%S').to_datetime).in_minutes.round
      
      one_day_before = (total_days - 1).days.seconds if total_days > 0
      one_hour_before = (total_minutes - 60).minutes.seconds if total_minutes >= 60
      [one_day_before, one_hour_before]
    end

    def get_date_time_combined date, time
      DateTime.new(date.year, date.month, date.day, time.hour, time.min, time.sec, time.zone)
    end
    
    # Use callbacks to share common setup or constraints between actions.
    def set_schedual_tour
      @schedual_tour = SchedualTour.find_by_id(params[:id])
    end

    # Never trust parameters from the scary internet, only allow the white list through.
    def schedual_tour_params
      params.require(:schedual_tour).permit(:tour_date, :tour_time, :tour_user_id, :tour_id, :card_token, :community_id)
    end
    def ajax_schedual_tour_params
      params.permit(:tour_date, :tour_time, :card_token)
    end

    def sms_notifire msg, to, tour_user_email, community_id
      to = to.delete(' ')
      TwilioSmsWorker.perform_async(msg, to, tour_user_email, community_id)
    end

    def make_phone
      begin
        user_phone = params[:tour_user][:phone_number].sub(/^[0]+/,'')
        user_phone = trim_leading('\+', user_phone) if user_phone.starts_with? '+'

        c = ISO3166::Country.new(params[:country_code])
        if user_phone.starts_with? c.country_code
          user_phone = "+#{user_phone}"
        else
          user_phone = "+#{c.country_code}#{user_phone}"
        end
        user_phone
      rescue => ex
        ""
      end
    end

    def trim_leading chr, str
      str.gsub(/^#{chr}+/,'')
    end

    def logo_style
      "outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; clear: both; display: inline-block !important; border: none; height: auto; float: none; width: 200px; max-width: 200px;"
    end

end

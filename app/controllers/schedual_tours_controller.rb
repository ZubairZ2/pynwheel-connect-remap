class SchedualToursController < ApplicationController
  before_action :set_schedual_tour, only: [:show, :edit, :update, :destroy]
  skip_before_action :authenticate_user!

  # GET /schedual_tours
  # GET /schedual_tours.json
  def index
    @schedual_tours = SchedualTour.where(community_id: @community.id).order('tour_time').order('tour_date') rescue ""
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
  
  def create_tour_user_from
    phone_number = make_phone
    tu = TourUser.find_by(email: params[:tour_user][:email].downcase)
    # tu.name = params[:tour_user][:name] if tu.present?
    f_name = params[:tour_user][:first_name].present? ? params[:tour_user][:first_name] : ""
    l_name = params[:tour_user][:last_name].present? ? params[:tour_user][:last_name] : ""
    tu = TourUser.new name: (f_name + " " + l_name), first_name: params[:tour_user][:first_name], last_name: params[:tour_user][:last_name], email: params[:tour_user][:email].downcase, phone_number: phone_number, card_expiry: params[:tour_user][:card_expiry] unless tu.present?
    tu.name = (f_name + " " + l_name)
    tu.first_name = f_name
    tu.last_name = l_name
    tu.phone_number = phone_number if phone_number.present?
    tu.desired_bedroom = params[:desired_bedroom]

    # binding.pry
    schedual_tour = SchedualTour.find(params[:sched_tour_id])
    if tu.save

      begin
        customer = Stripe::Customer.create email: params[:tour_user][:email].downcase,
                                           card: params[:tour_user][:card_token]
        res = Stripe::Charge.create customer: customer.id,
                              amount: 50,
                              description: "Escrow Payment",
                              currency: 'usd'
        sleep 3                      
        pay_back = Stripe::Refund.create({
          charge: res[:id],
        })                     
      rescue Exception => e
        flash[:error] = e.message
        puts "<<<<<<<<<<<<<<<<<<<<<<<<<<<#{e.message} #{e.backtrace}---"
        puts "<<<<<<<<<<<<<<<<<<<<<<<<<<<"
      end

      schedual_tour.update_attributes(tour_user_id: tu.id,charge_id: res.present? ? res[:id] : nil,pay_back_id: pay_back.present? ? pay_back[:id] : nil,desired_move_in_date: params[:desired_move_in_date],desired_bedroom: params[:desired_bedroom])

      begin
        sent_notifications = send_email_and_other_notifications schedual_tour
      rescue Exception => e
        puts "<<<<<<<<<<<<<<<<<<<<<<<<<<<#{e.message} #{e.backtrace} ---"
      end
      community = Community.find_by_id params[:community_id]

      if params[:desired_move_in_date].present?
        date = params[:desired_move_in_date].split('/')
        date[0],date[1] = date[1],date[0]
        date = date.join('-').to_date
        desired_move_in_date = date
      else
        desired_move_in_date = ""
      end

      appointment_time = (schedual_tour.tour_date.to_s +  " " + schedual_tour.tour_time.to_s.split(' ')[1]).to_datetime
      marketing_source = params[:marketing_source].present? ? params[:marketing_source] : "" rescue  ""
      community.realpage_insert_prospect(tu, appointment_time, marketing_source, desired_move_in_date) if community.present? and community.data_provider == "realpagesvc" # sending 'desired_move_in_date' for the parameter 'tour_time'
      # sms_notifire notification_content, params[:tour_user][:phone_number]
    else
      render json: {message: "some errors occured"}, status: 'failed'
    end
    community_code = (JWT.encode ({"community_id" => @community.id}), ENV['SECRET_KEY_BASE_v2'], 'HS256')
    redirect_to scheduler_widget_test_widget_path(message: sent_notifications[:web_notification], community_id: schedual_tour.community_id, community_code: community_code, direct: true) and return

  end
  # POST /schedual_tours
  # POST /schedual_tours.json
  def create
    date = DateTime.strptime(params[:tour_time], '%m/%d/%Y %l:%M %p')

    tour_time, day_diff = get_tour_datetime_and_diff date
    
    community = Community.find params[:community_id]
    before_30_mints = tour_time.to_time - 30.minutes
    after_30_mints = tour_time.to_time + 30.minutes
    before_30_mints, c = get_tour_datetime_and_diff before_30_mints
    after_30_mints, d = get_tour_datetime_and_diff after_30_mints

    total_count = community.schedual_tours.where(tour_date: date, tour_time: before_30_mints..after_30_mints).where.not(tour_user_id: nil,tour_type: "virtual").count
    total_count_per_day = community.schedual_tours.where(tour_date: date).where.not(tour_user_id: nil,tour_type: "virtual").count
    
    # virtual_count = community.schedual_tours.where(tour_date: date, tour_time: before_30_mints..after_30_mints,tour_type: "virtual").count
    self_tour_count = community.schedual_tours.where(tour_date: date, tour_time: before_30_mints..after_30_mints,tour_type: "self_tour").count
    guided_count = community.schedual_tours.where(tour_date: date, tour_time: before_30_mints..after_30_mints,tour_type: "guided").count
  
    in_limit_count, error_message, limit_type = check_limit(params[:tour_type], total_count,total_count_per_day,self_tour_count,guided_count,  @community)
    @show_tour_modal, @type_list, error = show_tour_type_modal(params[:show_self_tour_option], params[:show_guided_tour_option], in_limit_count, @community, limit_type, params[:error])
    # in_limit_count = (total_count < community.tour.max_tour_users.to_i) || (virtual_count < community.tour.max_virtual_tour_users.to_i) || (self_tour_count < community.tour.max_self_tour_tour_users.to_i) || (guided_count < community.tour.max_guided_tour_users.to_i)

    @schedual_tour = SchedualTour.new(tour_date: date, tour_time: tour_time, end_time: after_30_mints, community_id: params[:community_id], user_time_zone: params[:user_time_zone], day_diff: day_diff, tour_type: params[:tour_type])
    
    unless @type_list == []
      respond_to do |format|
        if @schedual_tour.save
          format.html { redirect_to @schedual_tour, notice: 'Schedual tour was successfully created.' }
          format.json { render  json: {schedual_tour: @schedual_tour, show_tour_type_modal: @show_tour_modal, type_list: @type_list, in_limit_count: in_limit_count} }
        else
          format.html { render :new }
          format.json { render json: @schedual_tour.errors, status: :unprocessable_entity }
        end
      end
      else
      render json: {message: error, code: "400" }
    end
  end
  def show_tour_type_modal(show_self_tour_option, show_guided_tour_option, in_limit, community, limit_type, error)
    
    if(show_self_tour_option == "false" && show_guided_tour_option == "false")
      return false , remove_array( [["Virtual","virtual"]] ,community,limit_type), error
    elsif (show_self_tour_option == "true" && show_guided_tour_option == "false")
      unless (limit_type.include? "total") || (limit_type.include? "self_tour")
        return true , remove_array([["Self Tour","self_tour"], ["Virtual","virtual"]], community,limit_type), "max tour users limit reached for the selected time"
      else
        return false , remove_array([["Virtual","virtual"]], community,limit_type), "max tour users limit reached for the selected time"
      end
    elsif (show_self_tour_option == "false" && show_guided_tour_option == "true")
      unless (limit_type.include? "total") || (limit_type.include? "guided")
        return true , remove_array([["Virtual","virtual"],["Guided Tour","guided"]], community,limit_type), "max tour users limit reached for the selected time"
      else
        return false , remove_array([["Virtual","virtual"]], community,limit_type), "max tour users limit reached for the selected time"
      end
    else
      if (limit_type.include?  "total")
        return true , remove_array([["Virtual","virtual"]], community,limit_type), "max tour users limit reached for the selected time"
      else
        return true , remove_array([["Self Tour","self_tour"],["Virtual","virtual"],["Guided Tour","guided"]], community,limit_type), "max tour users limit reached for the selected time"
      end
        
    end

  end
  def remove_array(arr, community, limit_type)
    if (!community.tour.tour_setting.allow_virtual_tour)
      arr = arr - [["Virtual","virtual"]]
    end
    if (!community.tour.tour_setting.allow_guided_tour || (limit_type.include? "guided"))
      arr = arr - [["Guided Tour","guided"]]
    end
    if (!community.tour.tour_setting.allow_self_tour || (limit_type.include? "self_tour"))
      arr = arr - [["Self Tour","self_tour"]]
    end
    return arr
  end
  def check_limit(tour_type, total_count,total_count_per_day,self_tour_count,guided_count, community )
    
    limit_type = []
    if (community.tour.max_tour_users.present? && total_count_per_day >= community.tour.max_tour_users.to_i)
      # return true, "max tour users limit reached for the day", (limit_type << "total")
      limit_type << "total"
    end
    if (community.tour.tour_setting.do_limit_max_tour && community.tour.tour_setting.limit_max_tour.present? && total_count >= community.tour.tour_setting.limit_max_tour.to_i)
      # return true, "max tour users limit reached for the selected time", (limit_type << "total")
      limit_type << "total"
    # elsif tour_type == "virtual" && community.tour.max_virtual_tour_users.present? && community.tour.max_virtual_tour_users.present? && !(virtual_count < community.tour.max_virtual_tour_users.to_i)
    #   return true, "max virtual tour users limit reached for the selected time", "virtual"
    end
    if community.tour.tour_setting.do_limit_max_tour && community.tour.max_self_tour_users.present? && community.tour.max_self_tour_users.present? && !(self_tour_count < community.tour.max_self_tour_users.to_i)
      # return true, "max self tour tour users limit reached for the selected time", (limit_type << "self_tour")
      limit_type << "self_tour"
    end
    if community.tour.tour_setting.do_limit_max_tour && community.tour.max_guided_tour_users.present? && community.tour.max_guided_tour_users.present? && !(guided_count < community.tour.max_guided_tour_users.to_i)
      # return true, "max guided tour users limit reached for the selected time", (limit_type << "guided")
      limit_type << "guided"
    end
    return true, "", limit_type
      

  end

  # PATCH/PUT /schedual_tours/1
  # PATCH/PUT /schedual_tours/1.json
  def update_tour_type
    st = SchedualTour.find params[:schedual_tour_id]
    st.tour_type = params[:tour_type]
    st.save
  end
  def update
    date = DateTime.strptime(params[:tour_time], '%m/%d/%Y %l:%M %p')
    
    tour_time, day_diff = get_tour_datetime_and_diff date

    @schedual_tour.update_attributes(tour_date: date, tour_time: tour_time, day_diff: day_diff)
    
    set_daily_email_sent = false
    set_daily_email_sent = true if day_diff >= 1
    @schedual_tour.update_attributes(hourly_email_sent: false, daily_email_sent: set_daily_email_sent)
    tu = @schedual_tour.tour_user
    # binding.pry
    puts "<<<<<<<<<<<<<<<<<<<<<<<<<<<#{@schedual_tour}"
    respond_to do |format|
      if @schedual_tour.save 

        begin
          sent_notifications = send_email_and_other_notifications @schedual_tour
    
        rescue Exception => e
          puts "<<<<<<<<<<<<<<<<<<<<<<<<<<<#{e.message} #{e.backtrace}---"
        end

        # format.html { redirect_to @schedual_tour, notice: 'Schedual tour was successfully created.' }
        # format.json { render :json, status: :updated, message: web_notification }
        # format.json { render json: @schedual_tour, status: :updated, location: @schedual_tour }
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
      redirect_to community_schedual_tours_path(@community), notice: 'Schedual tour was successfully destroyed.'
    else
      puts "<<<<<<<<<<<<<<<<<<<<<<<<<<<#{@schedual_tour}"
      @schedual_tour.destroy
      respond_to do |format|
        format.html { redirect_to schedual_tours_url, notice: 'Schedual tour was successfully destroyed.' }
        format.json { head :no_content }
      end
    end

    
  end

  private
    def get_tour_datetime_and_diff date
      tour_date = Date.strptime(date.in_time_zone(params[:user_time_zone]).strftime("%m/%d/%Y"), "%m/%d/%Y")
      server_current_date = Date.strptime(DateTime.current.in_time_zone(params[:user_time_zone]).strftime("%m/%d/%Y"), "%m/%d/%Y")
      tour_time = date.strftime("%l:%M %p")
      day_diff = (tour_date - server_current_date).to_i

      [tour_time, day_diff]
    end

    def send_email_and_other_notifications schedual_tour
      tu = schedual_tour.tour_user
      community = schedual_tour.community
      community_email = community.email.present? ? community.email : 'info@pynwheel.com'
      puts "<<<<<<<<<<<<<<<<<<<<<<<<<<<#{params}---"
      # day_before, hour_before = calculate_seconds_one_day_prior_for_delayed_email schedual_tour
      app_link = (Company.find community.company_id).name.downcase == "lincoln" ? "http://onelink.to/6fsxvq" : "http://onelink.to/m5vuhn"
      android_link = (Company.find community.company_id).name.downcase == "lincoln" ? "http://onelink.to/6fsxvq" : "http://onelink.to/m5vuhn"
      
      app_link_web = (Company.find community.company_id).name.downcase == "lincoln" ? "https://apps.apple.com/us/app/lincoln-property-self-tour/id1508997129" : "https://apps.apple.com/us/app/self-tour/id1488907392"
      android_link_web = (Company.find community.company_id).name.downcase == "lincoln" ? "https://play.google.com/store/apps/details?id=com.pynwheel.lincolnselftour" : "https://play.google.com/store/apps/details?id=com.pynwheel.selftour"
      
      email_content = "<div style='vertical-align:middle; text-align:center'><img style='height: 100px;' src='#{community.logo.present? ? community.logo.url : ''}' data-title='#{community.name}' /></div><br/>Thank you for scheduling your tour! We look forward to having you at the <b>#{community.name if community.present?}</b> on  <b>#{schedual_tour.tour_date.strftime("%A, %b %-d, %Y")}</b> at <b>#{ Time.parse(schedual_tour.tour_time.to_s).strftime("%-I:%M %P")}</b>. When you go to the property, you will need <br/> <ul><li>A photo ID</li> <li>Your mobile device with the Pynwheel Self Tour app installed.</li></ul>Please download Self Tour app before you arrive: <br><a href=#{app_link} target='_blank'>Download Self Tour.</a><br><br> #{community.email_text.gsub("\n", "<br>").html_safe rescue ""}"

      community_text = (Company.find community.company_id).name.downcase == "lincoln" ? "Lincolon Property Company Self Tour" : "Self Tour"
      web_notification = "<div style='vertical-align:middle; text-align:center'><img style='max-height: 100px;' src='#{community.logo.present? ? community.logo.url : '/assets/logo-small.png'}' data-title='#{community.name}' /></div><br/> Thank you, <b>#{tu.name}</b>! Your reservation is confirmed. We look forward to having you at <b>#{community.name if community.present?}</b> on <b>#{schedual_tour.tour_date.strftime("%A, %b %-d, %Y")}</b> at <b>#{ Time.parse(schedual_tour.tour_time.to_s).strftime("%-I:%M %P")}</b>. Please keep an eye out for texts and emails with further instructions. Please download the Pynwheel Self Tour app before you arrive: <br/> <a href=#{app_link_web} target='_blank'>Download Pynwheel Self Tour From App Store</a><br><a href=#{android_link_web} target='_blank'>Download Pynwheel Self Tour From Google Play</a>"
      sms_content = "Thank you for scheduling your tour! We look forward to having you at #{community.name if community.present?} on #{schedual_tour.tour_date.strftime("%A, %b %-d %Y")} at #{ Time.parse(schedual_tour.tour_time.to_s).strftime("%-I:%M %P")}. When you go to the property, you will need
-A photo ID
-Your mobile device with the #{community_text} app installed

Download #{community_text} #{app_link}

#{community.email_text}
"
      # sms_content = "Thank you, #{tu.name}! Your Self-Guided Tour Reservation is confirmed. We look forward to having you at the property(#{community.name.humanize if community.present?}) on  #{schedual_tour.tour_date.strftime("%A, %d %b %Y")} at #{ Time.parse(schedual_tour.tour_time.to_s).strftime("%I:%M %P")}. Please keep an eye out for texts and emails with further instructions. #{community.email_text}"

      # delayed_day_before_content = "We look forward to having you visit our property at #{ Time.parse(schedual_tour.tour_time.to_s).strftime("%I:%M %P")} tomorrow for your self-guided tour. <br/>Download Pynwheel Self Tour <a href='https://apps.apple.com/us/app/pynwheel/id876032030' target='_blank'> Download Pynwheel Self Tour </a>. <br/><a href='#{schedular_widget_change_tour_time_url(schedual_tour)}?datetime=#{get_date_time_combined(schedual_tour.tour_date, schedual_tour.tour_time).to_s}'>Change appointment</a>"

      # delayed_hour_before_content = "<a href=' https://www.google.com/maps/search/?api=1&query=#{community.latitude},#{community.longitude}'>Directions to Property</a><br/>When you arrive at the property, open <a href='https://apps.apple.com/us/app/pynwheel/id876032030' target='_blank'> Pynwheel Self Tour </a> to start your tour."

      
      # day_before = 5.minutes.seconds
      # hour_before = 3.minutes.seconds

      # DelayedSchedulerMailerJob.perform_in(day_before, "Your Tomorrow Tour", delayed_day_before_content, tu.email) if day_before.present?
      # DelayedSchedulerMailerJob.perform_in(hour_before, "Your self-guided tour starts soon!", delayed_hour_before_content, tu.email) if hour_before.present?

      community_mail = "<div style='vertical-align:middle; text-align:center'><img style='width: 150px;' src='#{community.logo.url}' data-title='#{community.name.humanize}' /></div><br/>Lucky you! Someone has scheduled a Self Tour at your property!<br>Name: #{tu.name}<br>Date: #{schedual_tour.tour_date.strftime("%m %d %Y")}<br>Time: #{Time.parse(schedual_tour.tour_time.to_s).strftime("%I:%M %P")}<br>Email: #{tu.email}<br>Phone: #{tu.phone_number}"
      # NotificationMailer.tour_history_mail("Tour has been scheduled", email_content, tu.email).deliver_later

      # DelayedSchedulerMailerJob.perform_async("Tour has been scheduled", email_content, tu.email,"A Self Tour has been scheduled!",community_mail,community.email)if (community.alert_contact == "email" || community.alert_contact == "both")
      DelayedSchedulerMailerJob.perform_async("Tour has been scheduled", email_content, tu.email,nil,nil,nil,community.email)if (community.alert_contact == "email" || community.alert_contact == "both")
      DelayedSchedulerMailerJob.perform_async("A Self Tour has been scheduled!",community_mail,community.email,nil,nil,nil,nil)if (community.alert_contact == "email" || community.alert_contact == "both" || community.alert_contact == "phone")

      sms_notifire sms_content, schedual_tour.tour_user.phone_number if (community.alert_contact == "phone" || community.alert_contact == "both") rescue nil

      {email_content: email_content, web_notification: web_notification, sms_content: sms_content}
      
      # {email_content: email_content, web_notification: web_notification, sms_content: sms_content, delayed_day_before_content: delayed_day_before_content, delayed_hour_before_content: delayed_hour_before_content}

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
      @schedual_tour = SchedualTour.find(params[:id])
    end

    # Never trust parameters from the scary internet, only allow the white list through.
    def schedual_tour_params
      params.require(:schedual_tour).permit(:tour_date, :tour_time, :tour_user_id, :tour_id, :card_token, :community_id)
    end
    def ajax_schedual_tour_params
      params.permit(:tour_date, :tour_time, :card_token)
    end


    def sms_notifire msg, to
      
      to = to.delete(' ')
      prod_from = '+12017012957'
      account_sid = 'AC100385e8559f1ad63a5dbfaa3272a8d5'
      auth_token = '1f768aeab1be375bfe8da7a5e7310e74'
      @client = Twilio::REST::Client.new(account_sid, auth_token)
      
      
      message = @client.messages
        .create( 
          body: msg,
          from: prod_from,
          to: to
        )
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

end

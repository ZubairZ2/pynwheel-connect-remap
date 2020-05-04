class SchedualToursController < ApplicationController
  before_action :set_schedual_tour, only: [:show, :edit, :update, :destroy]
  skip_before_action :authenticate_user!

  # GET /schedual_tours
  # GET /schedual_tours.json
  def index
    @schedual_tours = SchedualTour.all
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

    tu = TourUser.find_by(email: params[:tour_user][:email])
    
    tu = TourUser.new name: params[:tour_user][:name], email: params[:tour_user][:email], phone_number: phone_number, card_expiry: params[:tour_user][:card_expiry] unless tu.present?
    tu.phone_number = phone_number if phone_number.present?

    # binding.pry
    schedual_tour = SchedualTour.find(params[:sched_tour_id])
    if tu.save
      schedual_tour.update_attributes(tour_user_id: tu.id)
      begin
        customer = Stripe::Customer.create email: params[:tour_user][:email],
                                           card: params[:tour_user][:card_token]
        Stripe::Charge.create customer: customer.id,
                              amount: 50,
                              description: "Escrow Payment",
                              currency: 'usd'
      rescue Exception => e
        flash[:error] = e.message
        puts "<<<<<<<<<<<<<<<<<<<<<<<<<<<#{e.message} #{e.backtrace}---"
        puts "<<<<<<<<<<<<<<<<<<<<<<<<<<<"
      end

      begin
        sent_notifications = send_email_and_other_notifications schedual_tour
      rescue Exception => e
        puts "<<<<<<<<<<<<<<<<<<<<<<<<<<<#{e.message} #{e.backtrace} ---"
      end

      # sms_notifire notification_content, params[:tour_user][:phone_number]
    else
      render json: {message: "some errors occured"}, status: 'failed'
    end
    redirect_to schedular_widget_test_widget_path(message: sent_notifications[:web_notification], community_id: schedual_tour.community_id) and return

  end
  # POST /schedual_tours
  # POST /schedual_tours.json
  def create
    date = DateTime.strptime(params[:tour_time], '%m/%d/%Y %l:%M %p')
    
    tour_date, tour_time, day_diff = get_tour_datetime_and_diff date

    @schedual_tour = SchedualTour.new(tour_date: tour_date, tour_time: tour_time, community_id: params[:community_id], user_time_zone: params[:user_time_zone], day_diff: day_diff)

    respond_to do |format|
      if @schedual_tour.save
        format.html { redirect_to @schedual_tour, notice: 'Schedual tour was successfully created.' }
        format.json { render :show, status: :created, location: @schedual_tour }
      else
        format.html { render :new }
        format.json { render json: @schedual_tour.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /schedual_tours/1
  # PATCH/PUT /schedual_tours/1.json
  def update
    date = DateTime.strptime(params[:tour_time], '%m/%d/%Y %l:%M %p')
    
    tour_date, tour_time, day_diff = get_tour_datetime_and_diff date

    @schedual_tour.update_attributes(tour_date: tour_date, tour_time: tour_time, day_diff: day_diff)
    
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
    puts "<<<<<<<<<<<<<<<<<<<<<<<<<<<#{@schedual_tour}"
    @schedual_tour.destroy
    respond_to do |format|
      format.html { redirect_to schedual_tours_url, notice: 'Schedual tour was successfully destroyed.' }
      format.json { head :no_content }
    end
  end

  private
    def get_tour_datetime_and_diff date
      tour_date = Date.strptime(date.in_time_zone(params[:user_time_zone]).strftime("%m/%d/%Y"), "%m/%d/%Y")
      server_current_date = Date.strptime(DateTime.current.in_time_zone(params[:user_time_zone]).strftime("%m/%d/%Y"), "%m/%d/%Y")
      tour_time = date.strftime("%l:%M %p")
      day_diff = (tour_date - server_current_date).to_i

      [tour_date, tour_time, day_diff]
    end

    def send_email_and_other_notifications schedual_tour
      
      tu = schedual_tour.tour_user
      community = schedual_tour.community
      puts "<<<<<<<<<<<<<<<<<<<<<<<<<<<#{params}---"
      # day_before, hour_before = calculate_seconds_one_day_prior_for_delayed_email schedual_tour
      
      app_link = (Company.find community.company_id).name.downcase == "lincoln" ? "https://apps.apple.com/us/app/self-tour/id1488907392" : "https://apps.apple.com/us/app/lincoln-property-self-tour/id1508997129"
      android_link = (Company.find community.company_id).name.downcase == "lincoln" ? "https://play.google.com/store/apps/details?id=com.pynwheel.lincolnselftour" : "https://play.google.com/store/apps/details?id=com.pynwheel.selftour"
      email_content = "<div style='vertical-align:middle; text-align:center'><img style='width: 100px; max-height: 100px;' src='#{community.logo.present? ? community.logo.url : ''}' data-title='#{community.name.humanize}' /></div><br/>Thank you for scheduling your self-guided tour! We look forward to having you at the property(<b>#{community.name.humanize if community.present?}</b>) on  <b>#{schedual_tour.tour_date.strftime("%A, %d %b %Y")}</b> at <b>#{ Time.parse(schedual_tour.tour_time.to_s).strftime("%I:%M %P")}</b>. When you go to the property, you will need <br/> <ul><li>A photo ID</li> <li>This phone</li></ul>Please download the Pynwheel self-guided tour app from the App Store: before you arrive: <a href=#{app_link} target='_blank'> Download Pynwheel Self Tour </a> <br>Please download the Pynwheel self-guided tour app from the Google Play: before you arrive: <a href=#{android_link} target='_blank'> Download Pynwheel Self Tour </a> <br> #{community.email_text}"

      web_notification = "<div style='vertical-align:middle; text-align:center'><img style='width: 100px; max-height: 100px;' src='#{community.logo.present? ? community.logo.url : '/assets/logo-small.png'}' data-title='#{community.name.humanize}' /></div><br/> Thank you, <b>#{tu.name}</b>! Your Self-Guided Tour Reservation is confirmed. We look forward to having you at the property(<b>#{community.name.humanize if community.present?}</b>) on <b>#{schedual_tour.tour_date.strftime("%A, %d %b %Y")}</b> at <b>#{ Time.parse(schedual_tour.tour_time.to_s).strftime("%I:%M %P")}</b>. Please keep an eye out for texts and emails with further instructions. Please download the Pynwheel self-guided tour app from App Store before you arrive: <br/> <a href=#{app_link} target='_blank'> Pynwheel App </a><br>Please download the Pynwheel self-guided tour app from App Store before you arrive: <br/> <a href=#{android_link} target='_blank'> Pynwheel App </a>"

      sms_content = "Thank you, #{tu.name}! Your Self-Guided Tour Reservation is confirmed. We look forward to having you at the property(#{community.name.humanize if community.present?}) on  #{schedual_tour.tour_date.strftime("%A, %d %b %Y")} at #{ Time.parse(schedual_tour.tour_time.to_s).strftime("%I:%M %P")}. Please keep an eye out for texts and emails with further instructions. #{community.email_text}"

      # delayed_day_before_content = "We look forward to having you visit our property at #{ Time.parse(schedual_tour.tour_time.to_s).strftime("%I:%M %P")} tomorrow for your self-guided tour. <br/>Download Pynwheel Self Tour <a href='https://apps.apple.com/us/app/pynwheel/id876032030' target='_blank'> Download Pynwheel Self Tour </a>. <br/><a href='#{schedular_widget_change_tour_time_url(schedual_tour)}?datetime=#{get_date_time_combined(schedual_tour.tour_date, schedual_tour.tour_time).to_s}'>Change appointment</a>"

      # delayed_hour_before_content = "<a href=' https://www.google.com/maps/search/?api=1&query=#{community.latitude},#{community.longitude}'>Directions to Property</a><br/>When you arrive at the property, open <a href='https://apps.apple.com/us/app/pynwheel/id876032030' target='_blank'> Pynwheel Self Tour </a> to start your tour."

      
      # day_before = 5.minutes.seconds
      # hour_before = 3.minutes.seconds

      # DelayedSchedulerMailerJob.perform_in(day_before, "Your Tomorrow Tour", delayed_day_before_content, tu.email) if day_before.present?
      # DelayedSchedulerMailerJob.perform_in(hour_before, "Your self-guided tour starts soon!", delayed_hour_before_content, tu.email) if hour_before.present?


      
      # NotificationMailer.tour_history_mail("Tour has been scheduled", email_content, tu.email).deliver_later
      DelayedSchedulerMailerJob.perform_async("Tour has been scheduled", email_content, tu.email) if (community.alert_contact == "email" || community.alert_contact == "both")
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
      user_phone = params[:tour_user][:phone_number].sub(/^[0]+/,'')
      user_phone = trim_leading('\+', user_phone) if user_phone.starts_with? '+'

      c = ISO3166::Country.new(params[:country_code])
      if user_phone.starts_with? c.country_code
        user_phone = "+#{user_phone}"
      else
        user_phone = "+#{c.country_code}#{user_phone}"
      end
      user_phone
    end

    def trim_leading chr, str
      str.gsub(/^#{chr}+/,'')
    end

end

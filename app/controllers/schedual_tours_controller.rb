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


  def create_tour_user_from
    
    phone_number = make_phone

    tu = TourUser.new name: params[:tour_user][:name], email: params[:tour_user][:email], phone_number: phone_number, credit_card_number: params[:tour_user][:credit_card_number], card_expiry: params[:tour_user][:card_expiry]

    # binding.pry
    schedual_tour = SchedualTour.find(params[:sched_tour_id])
    
    if tu.save
      # binding.pry
      notification_content = "Thank you, #{tu.name}! for scheduling your self-guided tour! We look forward to having you at the property on <#{schedual_tour.tour_date.strftime("%A, %d %b %Y")}> and <#{ Time.parse(schedual_tour.tour_time.to_s).strftime("%I:%M %P")}>. When you go to the property, you will need 
        *A photo ID
        *This phone
        Please download the Pynwheel self-guided tour app before you arrive:
        Download Pynwheel Self Tour 
        https://apps.apple.com/us/app/pynwheel/id876032030"

        begin
          customer = Stripe::Customer.create email: params[:tour_user][:email],
                                             card: params[:tour_user][:card_token]
          Stripe::Charge.create customer: customer.id,
                                amount: 20 * 100,
                                description: "Escrow Payment",
                                currency: 'usd'
        rescue Exception => e
          # binding.pry
          flash[:error] = e.message
        end

      web_notification = "Thank you, <b>#{tu.name}</b>! Your Self-Guided Tour Reservation is confirmed. We look forward to having you at the property on  <b>#{schedual_tour.tour_date.strftime("%A, %d %b %Y")}</b> and <b>#{ Time.parse(schedual_tour.tour_time.to_s).strftime("%I:%M %P")}</b>. Please keep an eye out for texts and emails with further instructions. Please download the Pynwheel self-guided tour app before you arrive: <br/> <a href='https://apps.apple.com/us/app/pynwheel/id876032030' target='_blank'> Pynwheel App </a>"

      sms_content = "Thank you, #{tu.name}! Your Self-Guided Tour Reservation is confirmed. We look forward to having you at the property on  #{schedual_tour.tour_date.strftime("%A, %d %b %Y")} and #{ Time.parse(schedual_tour.tour_time.to_s).strftime("%I:%M %P")}. Please keep an eye out for texts and emails with further instructions. Please download the Pynwheel self-guided tour app before you arrive: https://apps.apple.com/us/app/pynwheel/id876032030."

      # render json: {message: notification_content}, status: 200
      begin
        NotificationMailer.tour_history_mail("Tour has been scheduled", sms_content, tu.email).deliver
      rescue Exception => e
        puts e.message
      end
      # sms_notifire notification_content, params[:tour_user][:phone_number]
    else
      render json: {message: "some errors occured"}, status: 'failed'
    end

    redirect_to schedular_widget_test_widget_path(message: web_notification) and return

  end
  # POST /schedual_tours
  # POST /schedual_tours.json
  def create
    
    date = DateTime.strptime(params[:tour_time], '%m/%d/%Y %l:%M %p')
    tour_date = date.strftime("%m/%d/%Y")
    tour_time = date.strftime("%l:%M %p")

    @schedual_tour = SchedualTour.new(tour_date: DateTime.strptime(tour_date, "%m/%d/%Y"), tour_time: tour_time)
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
    respond_to do |format|
      ajax_schedual_tour_params["tour_date"] = Date.strptime(ajax_schedual_tour_params["tour_date"], '%m/%d/%Y').to_date

      if @schedual_tour.update(ajax_schedual_tour_params)
        format.html { redirect_to @schedual_tour, notice: 'Schedual tour was successfully updated.' }
        format.json { render :show, status: :ok, location: @schedual_tour }
      else
        format.html { render :edit }
        format.json { render json: @schedual_tour.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /schedual_tours/1
  # DELETE /schedual_tours/1.json
  def destroy
    @schedual_tour.destroy
    respond_to do |format|
      format.html { redirect_to schedual_tours_url, notice: 'Schedual tour was successfully destroyed.' }
      format.json { head :no_content }
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_schedual_tour
      @schedual_tour = SchedualTour.find(params[:id])
    end

    # Never trust parameters from the scary internet, only allow the white list through.
    def schedual_tour_params
      params.require(:schedual_tour).permit(:tour_date, :tour_time, :tour_user_id, :tour_id, :card_token)
    end
    def ajax_schedual_tour_params
      params.permit(:tour_date, :tour_time, :card_token)
    end


    def sms_notifire msg, to
      to = to.delete(' ')
      test_from = '+15005550006'
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

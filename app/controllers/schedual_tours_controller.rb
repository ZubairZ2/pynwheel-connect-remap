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
    
    tu = TourUser.new name: params[:tour_user][:name], email: params[:tour_user][:email], phone_number: "#{params[:numbers]} #{params[:tour_user][:phone_number]}", credit_card_number: params[:tour_user][:credit_card_number], card_expiry: params[:tour_user][:card_expiry]

    schedual_tour = SchedualTour.find(params[:id])
    
    if tu.save
      email_content = "Thank you, #{tu.name}! Your Self-Guided Tour Reservation is confirmed for <b>#{schedual_tour.tour_date.strftime("%A, %d %b %Y")}</b> and <b>#{ Time.parse(schedual_tour.tour_time.to_s).strftime("%I:%M %P")}</b>. <br/> Please keep an eye out for texts and emails with further instructions."

      sms_content = "Thank you, #{tu.name}! Your Self-Guided Tour Reservation is confirmed for #{schedual_tour.tour_date.strftime("%A, %d %b %Y")} and #{ Time.parse(schedual_tour.tour_time.to_s).strftime("%I:%M %P")}. Please keep an eye out for texts and emails with further instructions."

      render json: {message: email_content}, status: 200

      NotificationMailer.tour_history_mail("Tour has been scheduled", email_content, tu.email).deliver
      # sms_notifire sms_content, params[:tour_user][:phone_number]
    else
      render json: {message: "some errors occured"}, status: 'failed'
    end

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
      params.require(:schedual_tour).permit(:tour_date, :tour_time, :tour_user_id, :tour_id)
    end
    def ajax_schedual_tour_params
      params.permit(:tour_date, :tour_time)
    end


    def sms_notifire msg, to
      to = to.delete(' ')
      account_sid = 'ACcd5341bccaa0000972f42fded7122d87'
      auth_token = 'b3bdde4cf7d6d4b61a7065580920bd53'
      @client = Twilio::REST::Client.new(account_sid, auth_token)
      
      
      message = @client.messages
        .create( 
          body: msg,
          from: '+12017012957',
          to: to
        )
  end

end

class SchedualToursController < ApplicationController
  before_action :set_schedual_tour, only: [:show, :edit, :update, :destroy]

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

  # POST /schedual_tours
  # POST /schedual_tours.json
  def create
    @schedual_tour = SchedualTour.new(schedual_tour_params)

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
      if @schedual_tour.update(schedual_tour_params)
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
end

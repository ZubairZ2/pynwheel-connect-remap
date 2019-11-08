class ElevatorsController < ApplicationController
  before_action :authenticate_user!
  before_action :check_community
  add_breadcrumb "Home", :root_path
  before_action :set_elevator, only: [:show, :edit, :update, :destroy]

  # GET /elevators
  # GET /elevators.json
  def index
    @community = current_community
    @elevators = @community.elevators
    add_breadcrumb "Elevators", community_elevators_path(current_community)
  end

  # GET /elevators/1
  # GET /elevators/1.json
  def show
  end

  # GET /elevators/new
  def new
    @elevator = Elevator.new
  end

  # GET /elevators/1/edit
  def edit
    @community = Community.find params[:community_id]
    @elevator = Elevator.find_by_id(params[:id])
  end
  def save_elevator_gallery
    @community = Community.find_by_id params[:community_id]
    @elevator = Elevator.find_by_id params[:elevator_id]
    ElevatorGallery.create(name: params[:name],image: params[:src], elevator_id: @elevator.id)
  end
  # POST /elevators
  # POST /elevators.json
  def create
    if params[:elevator_id].present?
      @elevator = Elevator.find_by_id params[:elevator_id]
      @elevator.image = params[:src]
      @elevator.save
      redirect_to edit_community_elevator_path(current_community, @elevator)
    else
      current_community.elevators.create(image: params[:src],name: params[:name])
      @elevators = current_community.elevators.order(id: :desc)
    end

    # respond_to do |format|
    #   # binding.pry
    #   # format.html { redirect_to action: 'index', notice: 'Elevator was successfully created.' }
    #   format.html { redirect_back(fallback_location: community_elevators_path) }

    #   format.js {render inline: "location.reload();" }
    # end
  end

  # PATCH/PUT /elevators/1
  # PATCH/PUT /elevators/1.json
  def update
    respond_to do |format|
      if @elevator.update(elevator_params)
        ts = TourStop.find_by(stop_type: "elevator", stop_id: @elevator.id)
        if ts.present?
          ts.update_attributes(name: @elevator.name)
        end
        format.html { redirect_back(fallback_location: community_elevators_path, notice: 'Elevator was successfully updated.') }
        format.js { render :show, status: :ok, location: @elevator }
      else
        format.html { render :edit }
        format.json { render json: @elevator.errors, status: :unprocessable_entity }
      end
    end
  end

  def remove_elevators_plotting
    current_community.elevators.update_all(x_plot: 0, y_plot: 0)
    redirect_to plot_elevators_community_sitemaps_path(current_community), notice: "All plots have been deleted successfully."
  end

  def remove_elevator_plotting
    current_community.elevators.find_by_id(params[:id]).update_attributes(x_plot: 0, y_plot: 0)
    redirect_to plot_elevators_community_sitemaps_path(current_community), notice: "Plotting have been deleted successfully."
  end

  def destroy_elevator_gallery
    
  end
  # DELETE /elevators/1
  # DELETE /elevators/1.json
  def destroy
    ts = TourStop.find_by(stop_type: "elevator", stop_id: @elevator.id)
    if ts.present?
      VisitedStop.where(tour_stop_id: ts.id).destroy_all
      ts.destroy
    end
    @elevator.destroy

    respond_to do |format|
      format.html { redirect_to community_elevators_url, notice: 'Elevator was successfully destroyed.' }
      # format.html { redirect_back(fallback_location: community_elevators_path) }
      format.json { head :no_content }
    end
  end



  private
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
    # Use callbacks to share common setup or constraints between actions.
    def set_elevator
      @elevator = Elevator.find(params[:id])
    end

    # Never trust parameters from the scary internet, only allow the white list through.
    def elevator_params
      params.require(:elevator).permit(:name, :description, :x_plot, :y_plot, :directional_text, :floorplate_id, :community_id, :image)
    end
end

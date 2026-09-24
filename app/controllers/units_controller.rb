class UnitsController < ApplicationController
  # include Error::ErrorHandler
  include AssignLocksHelper
  include Connect::InventoryJson
  add_breadcrumb "Home", :root_path
  before_action :set_community
  before_action :check_community
  before_action :set_unit, only: [:edit,:update,:destroy,:remove_pri_scnd_image, :update_lock_provider]
  before_action :load_all_locks, only: [:new, :create, :edit, :update]

  PER_PAGE = 50
  PER_PAGE_OPTIONS = [25, 50, 100, 200].freeze

  # "All" is still bounded. Pagination exists because rendering every unit of a
  # property is what made this page megabytes of HTML, so the escape hatch gets a
  # ceiling rather than an unbounded page - comfortably above the largest
  # property today, and the view says so when a set is actually clipped.
  MAX_PER_PAGE = 2000

  helper_method :per_page, :showing_all?, :per_page_capped?

  def index
    @communities = current_company.communities
    @currency_symbol = @community.get_currency_symbol
    @floorplans = @community.floorplans.order(:name).to_a
    @floorplans_by_provider_id = @floorplans.index_by(&:provider_floorplan_id)
    @filter = UnitFilterQuery.new(@community, filter_params)
    # includes(:door) is what keeps the lock column from firing one query per
    # row - it was the bulk of the 700+ queries this page used to run.
    scope = @filter.results.includes(:door)
    # Pynwheel Connect's read-only Property Inventory: every matching unit,
    # before the grid's paging and the one-time intro below.
    return render_connect_units(scope) if request.format.json?

    @units = scope.paginate(page: params[:page], per_page: resolve_per_page)
    @filter_options = unit_filter_options
    add_breadcrumb "Units", community_units_path(@community)

    # One-time orientation note. Marked seen on the first full page view only -
    # consuming it on a toolbar XHR would burn it without anyone seeing it.
    @show_intro = !current_user.welcome_unit_page && !request.xhr?
    current_user.update_column(:welcome_unit_page, true) if @show_intro

    # The toolbar re-requests this action on every keystroke and sorts/pages
    # through it too; sending back only the results fragment keeps the page
    # chrome and the mass override modals out of every one of those responses.
    render partial: "units_table", layout: false if request.xhr?
  end

  def show_unit_image_in_modal
    @community = Community.find params[:community_id]
    @unit = Unit.find params[:id]
  end

  def display_unit
    unit = Unit.find params[:id]
    unit.visible ? unit.visible = false : unit.visible = true
    unit.save

    render :json => {:visible=> unit.visible, :status => "200"}
  end

  def crop_unit_image
    @community = Community.find params["community_id"]
    @unit = Unit.find params["id"]
    if @unit.crop_x == params[:unit][:crop_x].to_f
      @unit.do_crop = false
    else
      @unit.do_crop = true
    end
    if params[:unit][:crop_h].to_f == 0 && params[:unit][:crop_w].to_f == 0
      @unit.do_crop = false
    end
    @unit.crop_x = params[:unit][:crop_x]
    @unit.crop_y = params[:unit][:crop_y]
    @unit.crop_w = params[:unit][:crop_w]
    @unit.crop_h = params[:unit][:crop_h]
    @unit.image_bit = true
    @unit.save!
    # #PaperTrail::Version.create(item_type: "Unit",item_id: @unit.id,event: "update",whodunnit: current_user.id,community_id: current_community.id, company_id: current_company.id,object: "name: #{@floorplan.name} community_id: '#{@floorplan.community_id}'")

    redirect_to edit_community_unit_path(@community, @unit)
  end

  def show_unit_secondary_image_in_modal
    @community = Community.find params[:community_id]
    @unit = Unit.find params[:id]
  end

  def update_lock_provider
    update_locks()
    
    flash[:notice] = "Lock added successfully!"
    redirect_to community_units_path(:community_id => @community.id)
  end

  def crop_unit_secondary_image
    @community = Community.find params["community_id"]
    @unit = Unit.find params["id"]
    if @unit.crop_x_secondary == params[:unit][:crop_x].to_f
      @unit.do_crop_secpndary = false
    elsif @unit.crop_x == params[:unit][:crop_x].to_f and @unit.crop_y == params[:unit][:crop_y].to_f and @unit.crop_w == params[:unit][:crop_w].to_f and @unit.crop_h == params[:unit][:crop_h].to_f
      @unit.do_crop_secpndary = false
    else
      @unit.do_crop_secpndary = true
    end
    if params[:unit][:crop_h].to_f == 0 && params[:unit][:crop_w].to_f == 0
      @unit.do_crop_secpndary = false
    end
    @unit.crop_x_secondary = params[:unit][:crop_x]
    @unit.crop_y_secondary = params[:unit][:crop_y]
    @unit.crop_w_secondary = params[:unit][:crop_w]
    @unit.crop_h_secondary = params[:unit][:crop_h]
    @unit.image_bit = false

    @unit.save
    # #PaperTrail::Version.create(item_type: "Floorplan",item_id: @floorplan.id,event: "update",whodunnit: current_user.id,community_id: current_community.id, company_id: current_company.id,object: "name: #{@floorplan.name} community_id: '#{@floorplan.community_id}'")

    redirect_to edit_community_unit_path(@community, @unit)
    # render :json=> {:success=>false}
  end

  def new
    @unit = @community.units.new
    add_breadcrumb "Units", community_units_path(@community)
    add_breadcrumb "Add Unit", new_community_unit_path
  end

  def create
    @unit = @community.units.new(unit_params)
    @unit.provider = "manually"
    if params[:unit][:availability] == "Unoccupied"
      @unit.available = true
    else
      @unit.available = false
    end
    if @unit.save
      update_locks()
      if @unit.floorplan.present? and @unit.floorplan.amenities.present? 
        floorplan_amenities = @unit.floorplan.amenities
        add_floorplan_amenities = "true"
        AssignFloorplanImagesToUnitJob.perform_async floorplan_amenities, add_floorplan_amenities, @unit
        #PaperTrail::Version.create(item_type: "Unit", item_id: @unit.id, event: "create", whodunnit: current_user.id, community_id: current_community.id, company_id: current_company.id, object: "marketing_name: '#{@unit.marketing_name}' community_id: '#{@unit.community_id}'")
      end
      flash[:notice] = "Unit created successfully."
      redirect_to community_units_path(:community_id => @community.id)
    else
      flash[:error] = @unit.errors.full_messages.join(',')
      render :new
    end
  end

  def edit
    add_breadcrumb "Units", community_units_path(@community)
    add_breadcrumb "Edit Unit", edit_community_unit_path(@community, @unit)
    @amenities = @unit.amenities.order(:sort)
    @community_info = Community.includes(:floorplans, :units).find(params[:community_id])
    @units = @community_info.units.map { |i| i.marketing_name.gsub(/\d+/) { |s| "%08d" % s.to_i } }.zip(@community_info.units).sort.map { |x, y| y }
    @all_locks = all_locks(@community)
    @door = @unit.door
  end

  def update
    previous_floorplan_id = @unit.floorplan_id
    if params[:unit].present? and params[:unit][:image]
      @unit.crop_x = nil
    end
    if params[:unit].present? and params[:unit][:secondary_image]
      @unit.crop_x_secondary = nil
    end
    @unit.image_bit = nil
    unit_previous_floorplan_amenities = @unit.amenities.where.not(floorplan_amenity_id: nil) rescue nil

    if @community.enable_locks
      lock_id = (params[:igloohome_lock].present? or params[:igloohome_lock] == "") ? params[:igloohome_lock] : (params[:remote_lock].present? or params[:remote_lock] == "") ? params[:remote_lock] : ((params[:dwelo_remote_lock].present? or params[:dwelo_remote_lock] == "") ? params[:dwelo_remote_lock] : ((params[:latch_lock].present? or params[:latch_lock] == "") ? params[:latch_lock] : ((params[:zerv_lock].present? or params[:zerv_lock] == "") ? params[:zerv_lock] : nil)))
      assign_lock(@community, @unit, lock_id) unless lock_id.nil?
    end
    respond_to do |format|
      ######## save item that updated
      if (params[:unit].present? and params[:unit][:availability].present? && params[:unit][:availability] == "Unoccupied")
        if @unit.available == false
          @unit.available_is_updated = true
        end
        @unit.available = true
      elsif (params[:unit].present? and params[:unit][:availability].present? && params[:unit][:availability] == "Occupied")
        if @unit.available == true
          @unit.available_is_updated = true
        end
        @unit.available = false
      end

      if (params[:unit][:marketing_name].present? && params[:unit][:marketing_name] != @unit.marketing_name)
        @unit.name_is_updated = true
        TourStop.where(stop_id: @unit.id).update_all(name: params[:unit][:marketing_name])
      end

      if (params[:unit][:floorplan_id].present? && params[:unit][:floorplan_id] != @unit.floorplan_id)
        @unit.floorplan_id_is_updated = true
      end
      if (params[:unit][:effective_rent].present? && params[:unit][:effective_rent] != @unit.effective_rent.to_i.to_s)
        @unit.effective_rent_is_updated = true
      end
      if (params[:unit][:available].present? && params[:unit][:available] != @unit.available)
        @unit.available_is_updated = true
        @unit.availability_is_updated = true
      end
      if (params[:unit][:sold].present? && params[:unit][:sold] != @unit.sold && @unit.sold.present?)
        @unit.sold_is_updated = true
      end
      if (params[:unit][:available_date].present? && params[:unit][:available_date] != @unit.available_date)
        @unit.available_date_is_updated = true
      end
      if (params[:unit][:floor].present? && params[:unit][:floor] != @unit.floor.to_i.to_s)
        @unit.floor_is_updated = true
      end
      if (params[:unit][:availability].present? && params[:unit][:availability] != @unit.availability)
        @unit.availability_is_updated = true
      end
      if params[:unit][:modal_unit].present?
        if params[:unit][:modal_unit] == "1"
          ts = TourStop.find_by(stop_id: @unit.id, tour_id: @community.community_tour.id, stop_type: "unit")
          TourStop.create(tour_id: @community.community_tour.id, stop_type: "unit", name: @unit.marketing_name, display_stop: true, stop_id: @unit.id, latitude: @unit.x_plot, longitude: @unit.y_plot) unless ts.present?
        else
          unless @unit.modal_unit == false
            ts = TourStop.find_by(stop_id: @unit.id, tour_id: @community.community_tour.id, stop_type: "unit")
            if ts.present?
              paths = Path.where(map_path_from_id: ts.stop_id)
              paths.each do |path|
                path.path_points.destroy_all
                path.destroy if path.present?
              end
              ts.destroy
            end
          end

        end
      end

      if params[:unit][:sold].present? && params[:unit][:sold] == "true"
        @unit.availability = "Occupied"
        @unit.available = false
      end

      if @unit.manual_override
        if params[:unit][:description].present?
          params[:unit][:description] = add_padding_description params[:unit][:description]
        end

        if params[:unit][:additional_fee].present?
          params[:unit][:additional_fee] = add_padding_description params[:unit][:additional_fee]
        end

        if @unit.update(unit_params)
          update_locks()
          if params[:unit].present? and @unit.floorplan.present? and params[:unit][:floorplan_id] != previous_floorplan_id
            delete_previous_floorplan_images = "delete previous"
            if unit_previous_floorplan_amenities.present?
              AssignFloorplanImagesToUnitJob.perform_async unit_previous_floorplan_amenities, delete_previous_floorplan_images, @unit
            end
            floorplan_amenities = @unit.floorplan.amenities rescue nil
            add_floorplan_amenities = "edit"
            AssignFloorplanImagesToUnitJob.perform_async floorplan_amenities, add_floorplan_amenities, @unit
          end
          set_manually_updated_column
          #PaperTrail::Version.create(item_type: "Unit", item_id: @unit.id, event: "update", whodunnit: current_user.id, community_id: current_community.id, company_id: current_company.id, object: "marketing_name: '#{@unit.marketing_name}' community_id: '#{@unit.community_id}'")
          if params[:floorNo].nil?
            format.html { redirect_to(community_units_path(@community.id), :notice => 'Unit updated successfully.') }
          else
            format.html { redirect_to(community_tours_path(@community) << '?floorNo=' + params[:floorNo], :notice => 'Unit updated successfully.') }
          end
          format.json { respond_with_bip(@unit) }
        else
          # incase of failure, redering to edit will require the edit page @varaibles
          @amenities = @unit.amenities.order(:sort)
          @community_info = Community.includes(:floorplans, :units).find(params[:community_id])
          @units = @community_info.units.map { |i| i.marketing_name.gsub(/\d+/) { |s| "%08d" % s.to_i } }.zip(@community_info.units).sort.map { |x, y| y }

          flash[:error] = @unit.errors.full_messages.join(',')
          format.html { render :action => "edit" }
          format.json { respond_with_bip(@unit) }
        end
      else
        if params[:unit][:manual_override].present? and params[:unit][:manual_override] == 'true'
          @unit.update(unit_params)
          update_locks()
          if params[:unit][:floorplan_id].present? and params[:unit][:floorplan_id] != previous_floorplan_id
            delete_previous_floorplan_images = "delete previous"
            AssignFloorplanImagesToUnitJob.perform_async unit_previous_floorplan_amenities, delete_previous_floorplan_images, @unit
            floorplan_amenities = @unit.floorplan.amenities rescue nil
            add_floorplan_amenities = "edit"
            AssignFloorplanImagesToUnitJob.perform_async floorplan_amenities, add_floorplan_amenities, @unit
          end
          set_manually_updated_column
          #PaperTrail::Version.create(item_type: "Unit", item_id: @unit.id, event: "update", whodunnit: current_user.id, community_id: current_community.id, company_id: current_company.id, object: "marketing_name: '#{@unit.marketing_name}' community_id: '#{@unit.community_id}'")
          if params[:floorNo].nil?
            format.html { redirect_to(community_units_path(@community.id), :notice => 'Unit updated successfully.') }
          else
            format.html { redirect_to(community_tours_path(@community) << '?floorNo=' + params[:floorNo], :notice => 'Unit updated successfully.') }
          end
          format.json { respond_with_bip(@unit) }
        else
          if (params[:unit][:marketing_name].present? && params[:unit][:marketing_name] != @unit.marketing_name) || (params[:unit][:floorplan_id].present? && params[:unit][:floorplan_id] != @unit.floorplan_id) || (params[:unit][:effective_rent].present? && params[:unit][:effective_rent] != @unit.effective_rent.to_i.to_s) || (params[:unit][:availability].present? && params[:unit][:availability] != @unit.availability) || (params[:unit][:building].present? && params[:unit][:building] != @unit.building) || (params[:unit][:available_date].present? && params[:unit][:available_date] != @unit.available_date.to_s) || (params[:unit][:square_feet].present? && params[:unit][:square_feet] != @unit.square_feet.to_i.to_s) || (params[:unit][:available].present? && params[:unit][:available] != @unit.available) || (params[:unit][:sold].present? && params[:unit][:sold] != @unit.sold.to_s) || (params[:unit][:floor].present? && params[:unit][:floor].to_i != @unit.floor) || (params[:unit][:provider_unit_id].present? && params[:unit][:provider_unit_id] != @unit.provider_unit_id)
            @unit.errors[:base] << "Please set manual override field first"

            # incase of failure, redering to edit will require the edit page @varaibles
            @amenities = @unit.amenities.order(:sort)
            @community_info = Community.includes(:floorplans, :units).find(params[:community_id])
            @units = @community_info.units.map { |i| i.marketing_name.gsub(/\d+/) { |s| "%08d" % s.to_i } }.zip(@community_info.units).sort.map { |x, y| y }

            flash[:error] = @unit.errors.full_messages.join(',')
            format.html { render :action => "edit" }
            format.json { respond_with_bip(@unit) }
          else
            @unit.update(unit_params)

            update_locks()

            if params[:unit][:floorplan_id].present? and params[:unit][:floorplan_id] != previous_floorplan_id
              delete_previous_floorplan_images = "delete previous"
              AssignFloorplanImagesToUnitJob.perform_async unit_previous_floorplan_amenities, delete_previous_floorplan_images, @unit
              floorplan_amenities = @unit.floorplan.amenities rescue nil
              add_floorplan_amenities = "edit"
              AssignFloorplanImagesToUnitJob.perform_async floorplan_amenities, add_floorplan_amenities, @unit
            end
            set_manually_updated_column
            #PaperTrail::Version.create(item_type: "Unit", item_id: @unit.id, event: "update", whodunnit: current_user.id, community_id: current_community.id, company_id: current_company.id, object: "marketing_name: '#{@unit.marketing_name}' community_id: '#{@unit.community_id}'")
            if params[:floorNo].nil?
              format.html { redirect_to(community_units_path(@community.id), :notice => 'Unit updated successfully.') }
            else
              format.html { redirect_to(community_tours_path(@community) << '?floorNo=' + params[:floorNo], :notice => 'Unit updated successfully.') }
            end
            format.json { respond_with_bip(@unit) }
          end
        end
      end
    end
  end

  def set_manually_updated_column
    if @unit.sold
      @unit.update(availability: "Occupied", available: false, available_date: '', availability_is_updated: true)
    end
    if params[:unit][:available] == 'true'

      @unit.update(availability: "Unoccupied", available: true, availability_is_updated: true)
    end
    if params[:unit][:available] == 'false'
      @unit.update(availability: "Occupied", available: false, availability_is_updated: true)
    end
  end

  def destroy
    ts = TourStop.where(stop_id: @unit.id)

    if ts.present?
      VisitedStop.where(tour_stop_id: ts.pluck(:id) ).destroy_all
      ts.destroy_all
    end

    #PaperTrail::Version.create(item_type: "Unit", item_id: @unit.id, event: "delete", whodunnit: current_user.id, community_id: current_community.id, company_id: current_company.id, object: "marketing_name: '#{@unit.marketing_name}' community_id: '#{@unit.community_id}'")
    @unit.destroy

    flash[:notice] = "Unit deleted successfully."
    redirect_to community_units_path(:community_id => @community.id)
  end

  def remove_pri_scnd_image
    if params[:image] == "primary"
      @unit.remove_image!
      @unit.standard_image_url = nil
      @unit.save
    elsif params[:image] == "secondary"
      @unit.remove_secondary_image!
      @unit.save
    end
    
    flash[:notice] = "Image removed successfully."
    redirect_back(fallback_location: root_path)
  end

  def ajaxplotunit
    unit = @community.units.where(floorplate_id: nil, provider_unit_id: params[:id])
    if unit.present?
      unit = unit.first
      #unit.first.update_attributes(x_plot: params[:x_plot],y_plot: params[:y_plot])
      if params[:x_plot].present? && params[:y_plot].present?
        unit.x_plot = params[:x_plot]
        unit.y_plot = params[:y_plot]
      end
      if params[:pointer].present?
        x_plot, y_plot, tag, id, selector = params[:pointer].values_at(:x_plot, :y_plot, :tag, :id, :selector)
        unit.pointer_data = { x_plot: x_plot, y_plot: y_plot, tag: tag, id: id, selector: selector }
      end
      unit.save(validate: false)
      TourStop.where(stop_id: unit.id).update_all(latitude: unit.x_plot, longitude: unit.y_plot)

      render json: { unit: unit }, status: 200
    else
      render json: {}, status: 404
    end
  end

  def ajaxplotunitforfloorplate
    unit = @community.units.where(provider_unit_id: params[:id])
    if unit.present?
      unit = unit.first
      if params[:x_plot].present? && params[:y_plot].present?
        unit.x_plot = params[:x_plot]
        unit.y_plot = params[:y_plot]
      end
      if params[:pointer].present?
        x_plot, y_plot, tag, id, selector = params[:pointer].values_at(:x_plot, :y_plot, :tag, :id, :selector)
        unit.pointer_data = { x_plot: x_plot, y_plot: y_plot, tag: tag, id: id, selector: selector }
      end
      unit.floorplate_id = params[:floorplate_id]
      unit.save(validate: false)
      TourStop.where(stop_id: unit.id).update_all(latitude: unit.x_plot, longitude: unit.y_plot)
      
      @test_units = Floorplate.find(params[:floorplate_id]).fetch_units
      render json: { unit: unit }, status: 200
    else
      render json: {}, status: 404
    end
  end

  def plot_unit_door
    unit = @community.units.where(provider_unit_id: params[:id]).first
    if unit.present?
      door ||= unit.door || unit.build_door
      door.update(community_id: @community.id, x_plot: params[:x_plot], y_plot: params[:y_plot])
      render json: {unit: unit, door: door.reload, success: true}
    else
      render json: {unit: {}, door: {}, success: false}
    end
  end

  def remove_unit_door_plot
    unit = @community.units.where(provider_unit_id: params[:id]).first
    render json: {unit: unit, door: unit.door, success: true}
    unit.door.destroy rescue return
  rescue
    render json: {unit: {}, door: {}, success: false}
  end

  def load_unit_door_lock
    @unit = @community.units.where(provider_unit_id: params[:id]).first
    @door = @unit.door
  end

  def update_unit_door_lock
    @unit = @community.units.where(provider_unit_id: params[:id]).first
    @door = @unit.door
    if params[:lock_provider] == "Manual" && params[:access_code] == ""
      @door.update(lock_provider: "", access_code: "")
    else
      @door.update(lock_provider: params[:lock_provider], access_code: params[:access_code])
    end
    assign_lock_to_door(@community, @door, params[:lock_id]) if params.has_key?("lock_id") && params[:lock_provider] != "Manual"
  end

  def plot_multiple_units_door_for_floorplate
    params[:ids].each do |id|
      unit = @community.units.where(provider_unit_id: id).first
      door ||= unit.door || unit.build_door
      door.update(community_id: @community.id, x_plot: params[:x_plot], y_plot: params[:y_plot])
    end

    data = []
    units = @community.units.where(provider_unit_id: params[:ids]).includes(:door).each do |unit|
      data << {id: unit.id, provider_id: unit.provider_unit_id, door: unit.door}
    end
    
    render json: {data: data, success: true}
  rescue
    render json: {data: [{}], success: false}
  end

  def remove_plot
    @unit = Unit.find_by(provider_unit_id: params[:id], community_id: @community.id)
    if params[:svg_deletion].to_s == "true"
      @unit.pointer_data = {}
    else
      @unit.x_plot = 0
      @unit.y_plot = 0
    end

    ts = TourStop.where(stop_id: @unit.id)
    if ts.present?
      VisitedStop.where(tour_stop_id: ts.ids).destroy_all
      ts.destroy_all
    end

    if @unit.save(validate: false)
      if params[:floorplate_id].present?
        @floorplate = Floorplate.find params[:floorplate_id]
        redirect_to community_floorplate_plotexp_path(@community, @floorplate), notice: "The plot has been deleted successfully."
      else
        redirect_to plotexp_community_sitemaps_path(@community), notice: "The plot has been deleted successfully."
      end
    else
      redirect_to plotexp_community_sitemaps_path(@community), error: "Something went wrong."
    end
  end

  def remove_plot_from_floorplate
    @floorplate = Floorplate.find params[:floorplate_id]
    @unit = Unit.find_by(provider_unit_id: params[:id], community_id: @community.id)
    if params[:svg_deletion].to_s == "true"
      @unit.pointer_data = {}
    else
      @unit.x_plot = 0
      @unit.y_plot = 0
    end
    @unit.floorplate_id = nil
    ts = TourStop.where(stop_id: @unit.id) unless @unit.modal_unit
    if @unit.modal_unit
      if ts.present?
        ts.update_all(latitude: 0, longitude: 0)
      end
    else
      if ts.present?
        VisitedStop.where(tour_stop_id: ts.ids).destroy_all
        ts.destroy_all
      end
    end

    if @unit.save(validate: false)
      redirect_to community_floorplate_plotexp_path(@community, @floorplate), notice: "The plot has been deleted successfully."
    else
      redirect_to community_floorplate_plotexp_path(@community, @floorplate), error: "Something went wrong."
    end
  end

  def adjust_position
    @unit = Unit.find params[:id]
    if params[:horizontal_position].present?
      @unit.x_plot = params[:horizontal_position].to_f
    end
    if params[:vertical_position].present?
      @unit.y_plot = params[:vertical_position].to_f
    end
    @unit.save(validate: false)
    flash[:notice] = "Marker position is adjusted successfully."
    redirect_to params[:redirect_path]
  end

  def set_floor
    mass_override_units.update_all(floor: params[:floor], manually_updated: true, floor_is_updated: true, updated_at: Time.current)
    flash[:notice] = "Floor is updated for units successfully."
    redirect_back(fallback_location: root_path)
  end

  def set_building
    mass_override_units.update_all(building: params[:building], manually_updated: true, building_is_updated: true, updated_at: Time.current)
    flash[:notice] = "Building is updated for units successfully."
    redirect_back(fallback_location: root_path)
  end

  # Mass override: point every selected unit at one floor plan. Mirrors the
  # floor plan change on the unit edit page, so only the floor plan association
  # and its derived amenities are touched - rent, square footage and the rest of
  # the unit's own data are left alone.
  def set_floorplan
    floorplan = @community.floorplans.find_by(id: params[:floorplan_id])
    unit_ids = mass_override_unit_ids

    # Units reference their floor plan by provider_floorplan_id, so a floor plan
    # missing one would silently unlink every selected unit.
    if floorplan.blank? || floorplan.provider_floorplan_id.blank?
      flash[:error] = "Please select a floor plan that has a Provider Floorplan ID."
    elsif unit_ids.blank?
      flash[:error] = "Please select at least one unit."
    else
      @community.units.where(id: unit_ids).update_all(
        floorplan_id: floorplan.provider_floorplan_id,
        floorplan_id_is_updated: true,
        manually_updated: true,
        updated_at: Time.current
      )
      AssignFloorplanToUnitsJob.perform_async(@community.id, unit_ids, floorplan.id)
      flash[:notice] = "Floor plan is updated for units successfully."
    end

    redirect_back(fallback_location: root_path)
  end

  def set_available_date
    mass_override_units.update_all(available_date: params[:available_date], manually_updated: true, available_date_is_updated: true, updated_at: Time.current)
    flash[:notice] = "Available date is updated for units successfully."
    redirect_back(fallback_location: root_path)
  end

  def set_available
    if params[:available] == 'true'
      mass_override_units.update_all(availability: "Unoccupied", manually_updated: true, available_date: Date.today - 1, available_is_updated: true, availability_is_updated: true, available: true, updated_at: Time.current)
    else
      mass_override_units.update_all(availability: "Occupied", manually_updated: true, available: false, available_is_updated: true, availability_is_updated: true, updated_at: Time.current)
    end
    flash[:notice] = "Available is updated for units successfully."
    redirect_back(fallback_location: root_path)
  end

  # Manual override, at whichever level the dialog asked for.
  #
  # Unit level flips the unit's own `manual_override`. Field level sets or clears
  # the per-field "set by hand" markers, which are what actually stop the
  # provider feed updating a column - and most of them are checked independently
  # of `manual_override`, so without this there was no way to hand a pinned field
  # back to the feed short of editing every unit one at a time.
  def set_manual_override
    if params[:override_scope].to_s == "field"
      apply_field_overrides
    else
      mass_override_units.update_all(manual_override: params[:manual_override], updated_at: Time.current)
      flash[:notice] = "Manual Override is updated for units successfully."
    end

    redirect_back(fallback_location: root_path)
  end

  def set_sold
    if params[:sold] == "true"
      mass_override_units.update_all(sold: params[:sold], manually_updated: true, availability: "Occupied", available: false, availability_is_updated: true, available_is_updated: true, updated_at: Time.current)
    else
      mass_override_units.update_all(sold: params[:sold], manually_updated: true, availability_is_updated: true, available_is_updated: true, updated_at: Time.current)
    end
    flash[:notice] = "Sold is updated for units successfully."
    redirect_back(fallback_location: root_path)
  end

  def add_additional_fees
    # The old modal posted this through `text_area :additional_fee, nil`, which
    # names the field `additional_fee[]` - so the value arrived as an array and
    # had to be un-stringified by slicing off the leading `["` and trailing `"]`.
    # The field is a plain text_area_tag now, so the value is just the value.
    formated_fee = add_padding_description params[:additional_fee].to_s

    mass_override_units.update_all(additional_fee: formated_fee, manually_updated: true, updated_at: Time.current)
    flash[:notice] = "Additional Fees is updated for units successfully."
    redirect_back(fallback_location: root_path)
  end

  def add_description
    str2 = add_padding_description params[:description].to_s

    update_attrs = { description: str2, manually_updated: true, updated_at: Time.current }
    update_attrs[:description_title] = params[:description_title].presence

    mass_override_units.update_all(update_attrs)
    flash[:notice] = "Description is updated for units successfully."
    redirect_back(fallback_location: root_path)
  end

  def add_padding_description(desc)
    str = ""
    ds = desc.split('<ul>')
    if ds.count > 1
      ds.each do |d|
        unless d == ""
          if d.include?('</ul>')

            d = "<ul style='padding-left: 18px;'>" + d
            str = str + d
          else
            str = str + d
          end
        end
      end
    else
      str = desc
    end
    str2 = ""
    ds2 = str.split('<ol>') # Adding padding for <ol>
    if ds2.count > 1
      ds2.each do |d2|
        unless d2 == ""
          if d2.include?('</ol>')
            d2 = "<ol style='padding-left: 18px;'>" + d2
            str2 = str2 + d2
          else
            str2 = str2 + d2
          end
        end
      end
    else
      str2 = str
    end
    str2
  end

  def set_image
    uploaded_file = params[:image_file]
    tmp_dir = Rails.root.join("tmp", "uploads")
    FileUtils.mkdir_p(tmp_dir)

    # Generate unique filename to avoid clashes
    tmp_path = tmp_dir.join("#{SecureRandom.uuid}_#{uploaded_file.original_filename}")

    # Copy the uploaded file into safe tmp folder
    FileUtils.cp(uploaded_file.tempfile.path, tmp_path)

    UploadImageForUnit.perform_async(@community.id, mass_override_unit_ids, tmp_path.to_s)

    flash[:notice] = "Image is being uploaded for units."
    redirect_back(fallback_location: root_path)
  end

  def set_amenities_for_units
    UploadAmenityForUnit.perform_async @community, params[:type_ids], params[:image], params[:name], params[:image_id]
    render json: { success: "success" }
  end

  private

  def render_connect_units(scope)
    render_connect_inventory(
      Connect::UnitSerializer.collection(
        scope, @community, floorplans_by_provider_id: @floorplans_by_provider_id, base_url: request.base_url
      ),
      @community,
      extra: {
        currency_symbol: @currency_symbol,
        data_provider: @community.data_provider.presence,
        last_sync: @community.data_provider_updated_on.presence,
        lock_devices: connect_lock_devices
      }
    )
  end

  # The lock devices the unit form offers (AssignLocksHelper#all_locks), one
  # list across vendors. A vendor record with a missing name makes that helper
  # raise; the units must still load when it does.
  def connect_lock_devices
    all_locks(@community).flat_map do |kind, locks|
      vendor = kind.to_s.delete_suffix("_locks")
      locks.map { |lock| { vendor: vendor, id: lock[:id], name: lock[:name], stop_id: lock[:stop_id] } }
    end
  rescue StandardError => e
    Rails.logger.warn("[Connect] lock devices unavailable for community #{@community.id}: #{e.class}: #{e.message}")
    []
  end

  def set_community
    @community = Community.find(params[:community_id])
  end

  def filter_params
    params.permit(*UnitFilterQuery::FILTER_KEYS, :sort, :dir, :per_page)
  end

  def per_page
    @per_page ||= resolve_per_page
  end

  def showing_all?
    @showing_all
  end

  # True when "All" was asked for but the matching set is larger than the cap,
  # so the page is showing the first MAX_PER_PAGE of it rather than everything.
  def per_page_capped?
    @per_page_capped
  end

  # The rows-per-page choice sticks for the rest of the session, so someone who
  # works at 200 rows does not have to re-pick it on every property and every
  # return trip. "All" is deliberately not remembered - it is an escape hatch for
  # one screenful of work, and silently reloading 2000 rows on a later visit is
  # not what anyone asked for. A fresh session still starts at PER_PAGE.
  def resolve_per_page
    requested = params[:per_page].to_s

    if requested == "all"
      @showing_all = true
      total = @filter.results.reorder(nil).count
      @per_page_capped = total > MAX_PER_PAGE
      @per_page = [[total, 1].max, MAX_PER_PAGE].min
    else
      @showing_all = false
      @per_page_capped = false
      @per_page = remembered_per_page(requested.to_i)
    end
  end

  def remembered_per_page(requested)
    if PER_PAGE_OPTIONS.include?(requested)
      session[:units_per_page] = requested
      requested
    else
      stored = session[:units_per_page].to_i
      PER_PAGE_OPTIONS.include?(stored) ? stored : PER_PAGE
    end
  end

  # Which units a mass override applies to. The grid normally posts the ids it
  # has checked; when the user takes the "select all N matching" shortcut it
  # posts the filter set instead and the server re-resolves it, rather than the
  # browser shipping thousands of ids it never rendered.
  def mass_override_unit_ids
    if params[:select_all_matching].to_s == "true"
      UnitFilterQuery.new(@community, scope_filter_params).results.pluck(:id)
    else
      Array(params[:unit_ids]).reject(&:blank?).map(&:to_i)
    end
  end

  # Each field carries its own three-way choice - leave alone, pin, or release -
  # so one submit can hand Price back to the feed while pinning Floor. Fields
  # left on "leave alone" are absent from the update entirely, which is what
  # keeps this from clobbering markers the user never looked at.
  def apply_field_overrides
    requested = params[:field_state].respond_to?(:to_unsafe_h) ? params[:field_state].to_unsafe_h : (params[:field_state] || {})

    attributes = requested.each_with_object({}) do |(key, value), acc|
      flag = Unit::FEED_OVERRIDE_FLAGS[key.to_s]
      next if flag.blank? || value.to_s.blank?

      acc[flag[:column]] = (value.to_s == "true")
    end

    unit_ids = mass_override_unit_ids

    if attributes.empty?
      flash[:error] = "No field was set to change. Switch at least one field to Pinned or Feed."
      return
    elsif unit_ids.blank?
      flash[:error] = "Please select at least one unit."
      return
    end

    @community.units.where(id: unit_ids).update_all(attributes.merge(updated_at: Time.current))

    pinned, released = attributes.partition { |_, value| value }.map do |group|
      group.map { |column, _| Unit::FEED_OVERRIDE_FLAGS.values.find { |f| f[:column] == column }[:label] }
    end

    parts = []
    parts << "pinned #{pinned.to_sentence}" if pinned.any?
    parts << "handed #{released.to_sentence} back to the data feed" if released.any?
    flash[:notice] = "#{parts.to_sentence.upcase_first} for #{helpers.pluralize(unit_ids.size, 'unit')}."
  end

  # The filters the "select all matching" choice was made against, posted under
  # their own key rather than at the top level. Several filters share a name
  # with the value a mass override is setting - floor, building, sold and
  # manual_override all collide - so flat params would silently narrow the set
  # to units that already have the value being applied.
  def scope_filter_params
    scope = params[:scope]
    return {} if scope.blank?

    scope.permit(*UnitFilterQuery::FILTER_KEYS)
  end

  def mass_override_units
    @community.units.where(id: mass_override_unit_ids)
  end

  # Distinct values behind the toolbar's dropdowns, so each one only offers
  # choices this property actually has.
  def unit_filter_options
    {
      floorplans: @floorplans,
      bedrooms: @floorplans.map { |f| f.bedrooms.presence }.compact.uniq.sort_by(&:to_f),
      bathrooms: @floorplans.map { |f| f.bathrooms }.compact.uniq.sort,
      floors: @community.units.distinct.where.not(floor: nil).order(:floor).pluck(:floor),
      buildings: @community.units.distinct.where.not(building: [nil, ""]).order(:building).pluck(:building),
      lock_providers: unit_lock_providers
    }
  end

  # Providers actually in use on this property, from either the unit column or an
  # attached door, so the filter never offers a choice that matches nothing.
  def unit_lock_providers
    from_units = @community.units.distinct.where.not(lock_provider: [nil, ""]).pluck(:lock_provider)
    from_doors = Door.where(attached_with_type: "Unit", attached_with_id: @community.units.select(:id))
                     .distinct.where.not(lock_provider: [nil, ""]).pluck(:lock_provider)
    (from_units + from_doors).uniq.sort
  end

  def unit_params
    params.require(:unit).permit!
  end

  def set_unit
    @unit = Unit.find params[:id]
  end

  def load_all_locks
    @all_locks = all_locks(@community)
  end

  def update_enable_locks()
    if @community.enable_locks
        lock_id = (params.has_key?("lock_id") or params[:lock_id] == "") ? params[:lock_id] : nil
        assign_lock(@community, @unit, lock_id) unless lock_id.nil?
        if params[:unit][:lock_provider] == "Manual"
          @unit.update_column(:lock_provider, "") if params[:unit][:access_code] == ""
        else
          @unit.update_column(:lock_provider, "") if lock_id.nil? or params[:lock_id] == ""
        end
      end 
  end

  def update_locks
    if @community.enable_locks
      if @unit.door.present?
        @door = @unit.door
        if params[:unit][:lock_provider] == "Manual" && params[:unit][:access_code] == ""
          @door.update(lock_provider: "", access_code: "", updated_at: Time.now.utc)
        else
          @door.update(lock_provider: params[:unit][:lock_provider], access_code: params[:unit][:access_code], updated_at: Time.now.utc)
        end
        assign_lock_to_door(@community, @unit.door, params[:lock_id]) if params.has_key?("lock_id") && params[:unit][:lock_provider] != "Manual"
      else
        update_enable_locks()
      end
    end
  end
end
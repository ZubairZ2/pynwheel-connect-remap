class FloorplansController < ApplicationController
  # include Error::ErrorHandler
  add_breadcrumb "Home", :root_path
  before_action :set_community
  before_action :check_community
  before_action :set_floorplan, only: [:edit,:update,:destroy, :remove_pri_scnd_image]

  def index
    @floorplans = @community.floorplans.order(id: :desc)
    @communities = current_company.communities
    add_breadcrumb "Floor plans", community_floorplans_path(@community)
  end

  def new
    @floorplan = @community.floorplans.new
    add_breadcrumb "Floor plans", community_floorplans_path(@community)
    add_breadcrumb "Add Floor plan", new_community_floorplan_path(@community)
  end

  def create
    @floorplan =  @community.floorplans.where(provider_floorplan_id: floorplan_params[:provider_floorplan_id]).last
    unless @floorplan.present?
      @floorplan = @community.floorplans.new(floorplan_params)
      @floorplan.provider = "manually"
      if @floorplan.save
        flash[:notice] = "Floor plan created successfully."
        #PaperTrail::Version.create(item_type: "Floorplan",item_id: @floorplan.id,event: "create",whodunnit: current_user.id,community_id: current_community.id, company_id: current_company.id,object: "name: #{@floorplan.name} community_id: '#{@floorplan.community_id}'")

        redirect_to community_floorplans_path(:community_id=>@community.id)
      else
        flash[:error] = @floorplan.errors.full_messages.join(',')
        render :new
      end
    else
      flash[:error] = "Provider Floorplan ID already associated with another floorplan please use unique Provider Floorplan ID"
      redirect_to community_floorplans_path(:community_id=>@community.id)
    end
  end

  def edit
    add_breadcrumb "Floor plans", community_floorplans_path(@community)
    add_breadcrumb "Floor plan Details", edit_community_floorplan_path(@community,@floorplan)
  end

  def remove_pri_scnd_image
    if params[:image] == "primary"
      @floorplan.remove_image!
      @floorplan.standard_image_url = nil
      @floorplan.save
    elsif params[:image] == "secondary"
      @floorplan.remove_secondary_image!
      @floorplan.save
    end
    redirect_to :back, notice: "Image removed successfully."
  end

  def show_floorplan_image_in_modal
    @community = Community.find params[:community_id]
    @floorplan = Floorplan.find params[:id]
  end
  def crop_image
    # com = Community.find 2140
    #
    @community = Community.find params["community_id"]
    @floorplan = Floorplan.find params["id"]
    # byebug
    # com.logo = @floorplan.image
    # @floorplan.image = Amenity.last.image
    # @floorplan.save
    # @floorplan.image = com.logo
    # @floorplan.save
    # @community = Community.find params["community_id"]
    # @floorplan = Floorplan.find params["id"]
    if @floorplan.crop_x == params[:floorplan][:crop_x].to_f
      @floorplan.do_crop = false
    else
      @floorplan.do_crop = true
    end
    if params[:floorplan][:crop_h].to_f == 0 && params[:floorplan][:crop_w].to_f == 0
      @floorplan.do_crop = false
    end
    @floorplan.crop_x = params[:floorplan][:crop_x]
    @floorplan.crop_y = params[:floorplan][:crop_y]
    @floorplan.crop_w = params[:floorplan][:crop_w]
    @floorplan.crop_h = params[:floorplan][:crop_h]
    @floorplan.image_bit = true
    @floorplan.save
    #PaperTrail::Version.create(item_type: "Floorplan",item_id: @floorplan.id,event: "update",whodunnit: current_user.id,community_id: current_community.id, company_id: current_company.id,object: "name: #{@floorplan.name} community_id: '#{@floorplan.community_id}'")

    redirect_to edit_community_floorplan_path(@community,@floorplan)
    # render :json=> {:success=>false}
  end
  def show_floorplan_secondary_image_in_modal
    @community = Community.find params[:community_id]
    @floorplan = Floorplan.find params[:id]
  end
  def crop_secondary_image
    @community = Community.find params["community_id"]
    @floorplan = Floorplan.find params["id"]
    if @floorplan.crop_x_secondary == params[:floorplan][:crop_x].to_f
      @floorplan.do_crop_secondary = false
    elsif @floorplan.crop_x == params[:floorplan][:crop_x].to_f and @floorplan.crop_y == params[:floorplan][:crop_y].to_f and @floorplan.crop_w == params[:floorplan][:crop_w].to_f and @floorplan.crop_h == params[:floorplan][:crop_h].to_f
      @floorplan.do_crop_secondary = false
    else
      @floorplan.do_crop_secondary = true
    end
    if params[:floorplan][:crop_h].to_f == 0 && params[:floorplan][:crop_w].to_f == 0
      @floorplan.do_crop_secondary = false
    end
    @floorplan.crop_x_secondary = params[:floorplan][:crop_x]
    @floorplan.crop_y_secondary = params[:floorplan][:crop_y]
    @floorplan.crop_w_secondary = params[:floorplan][:crop_w]
    @floorplan.crop_h_secondary = params[:floorplan][:crop_h]
    @floorplan.image_bit = false

    @floorplan.save
    #PaperTrail::Version.create(item_type: "Floorplan",item_id: @floorplan.id,event: "update",whodunnit: current_user.id,community_id: current_community.id, company_id: current_company.id,object: "name: #{@floorplan.name} community_id: '#{@floorplan.community_id}'")

    redirect_to edit_community_floorplan_path(@community,@floorplan)
    # render :json=> {:success=>false}
  end

  def update
    if params[:floorplan][:image]
      @floorplan.crop_x = nil
    end
    if params[:floorplan][:secondary_image]
      @floorplan.crop_x_secondary = nil
    end
    @floorplan.image_bit = nil
    respond_to do |format|
      if params[:floorplan][:description].present?
        params[:floorplan][:description] = add_padding_description params[:floorplan][:description]
      end
      if (params[:floorplan][:manual_override] == "false") && (params[:floorplan][:name] != @floorplan.name || params[:floorplan][:provider_floorplan_id] != @floorplan.provider_floorplan_id || params[:floorplan][:square_feet] != @floorplan.square_feet.to_i.to_s || params[:floorplan][:bedrooms] != @floorplan.bedrooms.to_i.to_s || params[:floorplan][:bathrooms] != @floorplan.bathrooms.to_s || params[:floorplan][:market_rent] != @floorplan.market_rent.to_i.to_s )
        format.html { render :edit }
        flash[:error] = "Please set manual override field first"
        message = '<div class="alert alert-warning">Please set manual override field first</div>'
        format.js {render js: "$('#flash-message').html('#{message}')"}
      else
        if params[:floorplan][:name] != @floorplan.name
          @floorplan.name_is_updated = true
        end
        if params[:floorplan][:square_feet] != @floorplan.square_feet.to_i.to_s
          @floorplan.square_feet_is_updated = true
        end
        if params[:floorplan][:bedrooms] != @floorplan.bedrooms.to_i.to_s
          @floorplan.bedroom_is_updated = true
        end
        if params[:floorplan][:bathrooms] != @floorplan.bathrooms.to_s
          @floorplan.bathroom_is_updated = true
        end
        if params[:floorplan][:market_rent] != @floorplan.market_rent.to_i.to_s
          @floorplan.market_rent_is_updated = true
        end
        if @floorplan.update(floorplan_params)
          #PaperTrail::Version.create(item_type: "Floorplan",item_id: @floorplan.id,event: "update",whodunnit: current_user.id,community_id: current_community.id, company_id: current_company.id,object: "name: #{@floorplan.name} community_id: '#{@floorplan.community_id}'")

          format.html { redirect_to community_floorplans_path(:community_id=>@community.id), notice: 'Floor plan updated successfully.' }
          message = '<div class="alert alert-success">'+@floorplan.name+' image uploaded successfully.</div>'
          format.js {render js: "$('#flash-message').html('#{message}')"}
        else
          format.html { render :edit }
          flash[:error] = @floorplan.errors.full_messages.join(',')
          message = '<div class="alert alert-warning">'+@floorplan.errors.full_messages.join(',')+'</div>'
          format.js {render js: "$('#flash-message').html('#{message}')"}
        end
      end
    end
  end

  def save_floorplan_name_order
    @community = Community.find params[:community_id]
    if params[:desc] == "sorting_desc"
      @community.floorplan_name_order = true
    elsif params[:desc] == "sorting_asc"
      @community.floorplan_name_order = false
    else
      @community.floorplan_name_order = nil
    end
    @community.save
  end
  def destroy
    @floorplan.destroy
    #PaperTrail::Version.create(item_type: "Floorplan",item_id: @floorplan.id,event: "destroy",whodunnit: current_user.id,community_id: current_community.id, company_id: current_company.id,object: "name: #{@floorplan.name} community_id: '#{@floorplan.community_id}'")

    flash[:notice] = "Floor plan deleted successfully."
    redirect_to community_floorplans_path(:community_id=>@community.id)
  end

  def add_description
    description = params[:description].to_s
    desc = description[2..description.length-3]
    str2 = add_padding_description desc
    @community.floorplans.where(id: params[:floorplan_ids]).update_all(description:  str2)
    flash[:notice] = "Description is updated for units successfully."
    redirect_to :back
  end

  def add_padding_description(desc)
    str = ""
    ds = desc.split('<ul>') # Adding padding for <ul>
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

  private

  def set_floorplan
    @floorplan = Floorplan.find params[:id]
  end

  def floorplan_params
    params.require(:floorplan).permit!
  end

  def set_community
    @community = Community.find(params[:community_id])
  end
end
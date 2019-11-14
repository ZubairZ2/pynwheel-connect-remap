class Api::V1::ToursController < ActionController::Base
  #before_action :set_community, only: [:data,:ios_data,:email_favorites]
  # before_action :set_community, only: :email_favorites
  def save_user_data

    tempFile = params[:image]
    # tempFile = tempFile.path
    # image_base = Base64.encode64(File.read(tempFile.path))

    unless params[:tour_user_id].present? && params[:tour_stop_id].present? && params[:tour_id].present?
      render :json=> {:success=>false, :message => "Please enter tour user id, tour stop id or tour id"}
    else
      begin
      vs = VisitedStop.create(tour_user_id: params[:tour_user_id].to_i,tour_stop_id: params[:tour_stop_id].to_i,tour_id: params[:tour_id].to_i,image: tempFile, description: params[:description].present? ? params[:description] : nil, device_id: params[:device_id], tour_key: params[:tour_key])
      rescue => ex
        render :json=> {:success=>false, :message => "failed"}
      end
      if vs.present?
        render :json=> {:success=>true, :message => "success"}
      else
        render :json=> {:success=>false, :message => "failed"}
      end
    end

  end
  def save_user_selfie

    tempFile = params[:image]
    unless params[:tour_user_id].present? && params[:image].present?
      render :json=> {:success=>false, :message => "Please enter tour user id, image"}
    else
      begin
        vs = TourUser.find_by(id: params[:tour_user_id].to_i)
        vs.image = tempFile
        if vs.id_card.present? && vs.image.present?
          vs.id_selfie_mismatch = false
          email_content = "Please verify user on the following link <br/> <a href='#{manual_selfie_match_url vs.id }' target='_blank'> Visitor's ID page </a>"
          DelayedSchedulerMailerJob.perform_async("ID / Selfie Matching (Manual)", email_content, 'jennifer@pynwheel.com') unless params[:local_testing].present?
          DelayedSchedulerMailerJob.perform_async("ID / Selfie Matching (Manual)", email_content, 'usman.khalid@intagleo.co.uk')
          DelayedSchedulerMailerJob.perform_async("ID / Selfie Matching (Manual)", email_content, 'arslan.mirza@intagleo.com')

        end
        puts "<<<<<<<<<<<<<<<<<<<<<<<<< #{vs.valid?}"
        vs.save!(validate: false)
      rescue => ex
        puts "<<<<<<<<<<<<<<<<<<<<<<<<< #{ex.message}"
        render :json=> {:success=>false, :message => "failed"} and return
      end
      if vs.present?
        render :json=> {:success=>true, :message => "success"} and return 
      else
        render :json=> {:success=>false, :message => "failed"} and return
      end
    end
  end
  def save_user_id_card

    tempFile = params[:image]
    unless params[:tour_user_id].present? && params[:image].present?
      success = false;
      message = "Please enter tour user id, selfie"
    else
      begin
        vs = TourUser.find_by(id: params[:tour_user_id].to_i)
        vs.id_card = tempFile
        vs.save
      rescue => ex
        success = false;
        message = "failed#{ex.message}"
      end
      if vs.present?
        success = true;
        message = "success"
      else
        success = false;
        message = "failed"
      end
      render :json=> {:success=>success, :message => message}
    end
  end
  def save_user_tour
    unless params[:tour_user_id].present? && params[:tour_stop_id].present? && params[:tour_id].present?
      render :json=> {:success=>false, :message => "Please enter tour user id, tour stop id or tour id"}
    else
      arr = []
      stops = params[:tour_stop_id].split(',')
      begin
        a1 = TourUser.find params[:tour_user_id].to_i
        a2 = Tour.find params[:tour_id].to_i
      rescue => ex
      end
      stops.each do |stop_id|
        begin
          a3 = TourStop.find stop_id.to_i
        rescue => ex
        end
        if a1.present? && a2.present? && a3.present?
          vs = VisitedStop.create(tour_user_id: params[:tour_user_id].to_i,tour_stop_id: stop_id.to_i,tour_id: params[:tour_id].to_i, device_id: params[:device_id], tour_key: params[:tour_key])
        end
        if vs.present?
          arr << true
        else
          arr << false
        end
      end
      render :json=> {:success=>true, :message => "success", :data => arr}

    end
  end
  def tour_user_login
    tu = TourUser.find_by(email: params[:email])
    if tu.present?
      render :json=> {:success=>true, :message => "User present", tour_user: tu}
    else
      render :json=> {:success=>false, :message => "User not present"}
    end
  end

  def save_shared_tour
    shared_tour = SharedTour.new shared_tour_params
    if shared_tour.save
      tu = TourUser.find_by(id: params[:tour_user_id])
      
      
      vs = VisitedStop.where(tour_id: params[:tour_id], tour_user_id: params[:tour_user_id], tour_key: params[:tour_key], device_id: params[:device_id]).group(:tour_stop_id).count

      description_arr = []
      gallery_arr = []
      
      visited_stops = []

      vs.keys.each { |x| visited_stops << TourStop.find_by_id(x) }


      community = visited_stops.last.tour.community
      shared_tour_stops = {}
      stops = []
      visited_stops.each_with_index do |x,i|
        puts "Visited Stop #{x.stop_type} >>>>>>>>>>>>>>>>>>>>>>>>>"

        descriptions = VisitedStop.where(tour_stop_id: vs.keys[i], tour_id: params[:tour_id], tour_user_id: params[:tour_user_id], tour_key: params[:tour_key], device_id: params[:device_id]).where.not(description: nil)

        images = VisitedStop.where(tour_stop_id: vs.keys[i], tour_id: params[:tour_id], tour_user_id: params[:tour_user_id], tour_key: params[:tour_key], device_id: params[:device_id]).where.not(image: nil)
        gallery_arr = []
        
        images.each do |ud|
          gallery_arr << ud.image.url
        end
        description_arr = []
        descriptions.each do |un|
          description_arr << un.description
        end

        stop = x.stop_type.classify.constantize.where(id: x.stop_id) if x.present?
        shared_tour_stops[x.stop_id] = {stops: stop, description: description_arr, images: gallery_arr }
      end
      begin
        FavoriteMailer.email_shared_tour([shared_tour.email, 'arslan.mirza@intagleo.com'],shared_tour_stops,community).deliver_now
      rescue => ex
        puts "Visited Stop #{ex} >>>>>>>>>>>>>>>>>>>>>>>>>"
        puts ex
      end

      email_content = "There are total tour stops, we need tour_user_id to get visited stops Please send that #{visited_stops.to_s}"
      # DelayedSchedulerMailerJob.perform_async("A Tour Shared With You", email_content, 'usman.khalid@intagleo.co.uk')
      render :json=> {:success=>true, :message => "success", :data => visited_stops}
    else
      render :json=> {:success=>false, :message => "shared tour was not saved, please try again."}
    end
  end

  def floorplan_units
    if params[:unit_id].present?
      unit = Unit.find_by_id(params[:unit_id])
      @units = Unit.where(floorplan_id: unit.floorplan_id,community_id: unit.community_id) if unit.present?
      @units.each do |u|
        if u.community.is_sitemap?
          u.sitemap_image_url = u.community.sitemap.image.url(:svg_for_metro).present? ? u.community.sitemap.
            image.url(:svg_for_metro) : u.community.sitemap.image.url
        else
          floorplate = Floorplate.find_by_id(u.floorplate_id)
          floorplate_image = floorplate.image.url if floorplate.present?
          u.sitemap_image_url = floorplate_image
        end
        u.availability_url = u.availability_url.present? ? u.availability_url : (u.floorplan.availability_url.present? ? u.floorplan.availability_url : nil)
      end
      success = true
      message = 'success'
      floorplate_image = unit.floorplate.present? ? unit.floorplate.image_url : "No Floorplate Image"
    else
      success = false
      message = 'Please provide unit_id'
    end
    render :json=> {:success=>success, :message => message, :data => @units ||= {}, :floorplate_image => floorplate_image }
  end

  private

  def share_tour_data
    st = SharedTour.joins(:tour => [:tour_stops, :community])
  end

  def set_community
    @community = Community.find(params[:id])
  end

  def shared_tour_params
    params.permit(:name, :phone, :email, :tour_id, :recipient_name)
  end
end
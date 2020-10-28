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
      vs = VisitedStop.create(tour_user_id: params[:tour_user_id].to_i,tour_stop_id: params[:tour_stop_id].to_i,tour_id: params[:tour_id].to_i,image: tempFile, description: params[:description].present? ? params[:description] : nil, device_id: params[:device_id], tour_key: params[:tour_key], is_rotated: false,event_time: params[:event_dateTime].present? ? DateTime.parse(params[:event_dateTime]).strftime('%a, %d %b %Y %H:%M:%S') : nil,event_date: params[:event_dateTime].present? ? DateTime.parse(params[:event_dateTime]).strftime('%a, %d %b %Y %H:%M:%S') : nil)
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
        community = Community.find_by_id params[:community_id]
        community_name = "visiting the community " + community.name if community.present?
        vs.image_bit = true
        vs.crop_image_bit = true
        vs.image = tempFile
        vs.croped = true
        if vs.id_card.present? && vs.image.present?
          vs.id_selfie_mismatch = false
          url = Rails.env.production? ? "https://pynwheelconnect.com/id_selfie_matching/#{vs.id }?community=#{community.id}" : "https://pynwheel-staging.herokuapp.com/id_selfie_matching/#{vs.id }?community=#{community.id}"
          email_content = "Please verify the user #{vs.name} #{community_name} on the following link <br/> <a href='#{url}' target='_blank'> Visitor's ID page </a>"
          DelayedSchedulerMailerJob.perform_async("ID / Selfie Matching (Manual)", email_content, 'jennifer@pynwheel.com') unless params[:local_testing].present?
          DelayedSchedulerMailerJob.perform_async("ID / Selfie Matching (Manual)", email_content, 'usman.khalid@intagleo.co.uk')
          DelayedSchedulerMailerJob.perform_async("ID / Selfie Matching (Manual)", email_content, 'nawaal.asif@intagleo.com')
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
        vs.image_bit = false
        vs.crop_image_bit = false
        vs.croped = true
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
          s_id , dateTime = stop_id.split('|')
          a3 = TourStop.find s_id.to_i
          _date = dateTime.present? ? DateTime.parse(dateTime).strftime('%a, %d %b %Y %H:%M:%S') : nil
        rescue => ex
        end
        if a1.present? && a2.present? && a3.present?
          vs = VisitedStop.create(tour_user_id: params[:tour_user_id].to_i,tour_stop_id: stop_id.to_i,tour_id: params[:tour_id].to_i, device_id: params[:device_id], tour_key: params[:tour_key], is_rotated: false, event_date: _date, event_time: _date)
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
  def start_tour_auto_message
    begin
      app_link = params[:company_name].downcase == "lincoln" ? "https://apps.apple.com/us/app/lincoln-property-self-tour/id1508997129" : "https://apps.apple.com/us/app/self-tour/id1488907392" rescue "https://apps.apple.com/us/app/self-tour/id1488907392"
      android_link = params[:company_name].downcase == "lincoln" ? "https://play.google.com/store/apps/details?id=com.pynwheel.lincolnselftour" : "https://play.google.com/store/apps/details?id=com.pynwheel.selftour" rescue "https://play.google.com/store/apps/details?id=com.pynwheel.selftour"
       
      if params[:access_token] == "AC1097385e8559f1ad63"
        to = params[:phone_number]
        start_tour_auto_msg = "Thank you for choosing to tour our property!
click here to start your tour.
iPhone Users:
#{app_link}
Android Users:
#{android_link}"

        prod_from = '+12017012957'
        account_sid = 'AC100385e8559f1ad63a5dbfaa3272a8d5'
        auth_token = '1f768aeab1be375bfe8da7a5e7310e74'
        @client = Twilio::REST::Client.new(account_sid, auth_token)


        message = @client.messages
                      .create(
                          body: start_tour_auto_msg,
                          from: prod_from,
                          to: to
                      )
        render :json=> {:success=>true, :message => "Message Sent"}
      else
        render :json=> {:success=>false, :message => "Message Not Sent", :error => "Invalid Token"}
      end
    rescue => ex
      render :json=> {:success=>false, :message => "Message Not Sent", :error => ex}
    end
  end
  def tour_user_login
    tu = TourUser.where("lower(email) = ?", params[:email].downcase)&.first
    if tu.blank?
      tu = TourUser.create(email: params[:email].downcase, name: params[:first_name] + " " + params[:last_name],first_name: params[:first_name], last_name: params[:last_name],id_selfie_mismatch: false)
    else
      tu.update_attributes(name: params[:first_name] + " " + params[:last_name],first_name: params[:first_name], last_name: params[:last_name],id_selfie_mismatch: false)
    end
    community = Community.find_by_id params[:community_id]
    allow = true
    if tu.present?
      if community.present? and community.restrict_access
        allow = false unless community.allowed_emails.pluck(:email).include?(tu.email.downcase)
      end
      render :json=> {:success=>true, :message => "User present", tour_user: tu, allowed_email: false} and return if allow == false
      render :json=> {:success=>true, :message => "User present", tour_user: tu, allowed_email: true}
    else
      render :json=> {:success=>false, :message => "User not present"}
    end
  end
  
  def save_shared_tour
    shared_tour = SharedTour.new shared_tour_params
    if shared_tour.save
      tu = TourUser.find_by(id: params[:tour_user_id])
      
           # VisitedStop.where(tour_user_id: @tour_user.id, tour_id: tour.id,tour_key: tour_key,device_id: @device_id).group('tour_stop_id').count
      last_stop = VisitedStop.where(tour_user_id: params[:tour_user_id],tour_id: params[:tour_id]).last
      vs = VisitedStop.where(tour_id: params[:tour_id], tour_user_id: params[:tour_user_id],tour_key: last_stop.tour_key).group(:tour_stop_id).count

      description_arr = []
      gallery_arr = []
      
      visited_stops = []
      vs.delete(params[:tour_id]) rescue ""
      vs.keys.each { |x| visited_stops << TourStop.find_by_id(x) }
      visited_stops = visited_stops.compact rescue visited_stops
      community = visited_stops.last&.tour.community
      shared_tour_stops = {}
      stops = []
      visited_stops.compact.each_with_index do |x,i|
        puts "Visited Stop #{x.stop_type} >>>>>>>>>>>>>>>>>>>>>>>>>"
        if x.stop_type != "elevator" && (x.id != params[:tour_id])
          descriptions = VisitedStop.where(tour_stop_id: vs.keys[i], tour_id: params[:tour_id], tour_user_id: params[:tour_user_id], tour_key: params[:tour_key]).where.not(description: nil)

          images = VisitedStop.where(tour_stop_id: vs.keys[i], tour_id: params[:tour_id], tour_user_id: params[:tour_user_id], tour_key: params[:tour_key]).where.not(image: nil)
          gallery_arr = []
          
          images.each do |ud|
            gallery_arr << ud.image.url
          end
          description_arr = []
          descriptions.each do |un|
            description_arr << un.description
          end

          stop = x.stop_type.classify.constantize.where(id: x.stop_id).order(:id) if x.present?
          shared_tour_stops[x.stop_id] = {stops: stop, description: description_arr, images: gallery_arr }
        end
      end
      begin
        puts "tour_po"*200
        puts shared_tour_stops.map{|x| x[0]}
        shared_tour_stops.delete(params[:tour_id])
        FavoriteMailer.email_shared_tour([shared_tour.email],shared_tour_stops,community).deliver_now
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
      @units = Unit.where('floorplan_id = ? AND community_id = ? AND available = ?', unit.floorplan_id,unit.community_id,true) if unit.present?
      @units.each do |u|
        if u.community.is_sitemap?
          u.sitemap_image_url = u.community.sitemap.image.url(:svg_for_metro).present? ? u.community.sitemap.
            image.url(:svg_for_metro) : u.community.sitemap.image.url rescue ""
          @sitemap_image_url = u.sitemap_image_url

        else
          floorplate = Floorplate.find_by_id(u.floorplate_id)
          floorplate_image = floorplate.image.url if floorplate.present?
          u.sitemap_image_url = floorplate_image
          @sitemap_image_url = floorplate_image
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
    unless params[:stringFormat].present? && params[:stringFormat] == "true"
      render :json=> {:success=>success, :message => message, :data => @units ||= {}, :floorplate_image => floorplate_image }
    end
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
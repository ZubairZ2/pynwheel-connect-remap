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
      render :json=> {:success=>false, :message => "Please enter tour user id, selfie"}
    else
      begin
        vs = TourUser.find_by(id: params[:tour_user_id].to_i)
        vs.id_card = tempFile
        vs.save
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
      visited_stops = shared_tour.visited_stops
      
      render :json=> {:success=>true, :message => "success", :data => shared_tour}
    else
      render :json=> {:success=>false, :message => "shared tour was not saved, please try again."}
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
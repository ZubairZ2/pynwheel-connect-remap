module Api
  module V1
    class ToursController < BaseController      
      #before_action :set_community, only: [:data,:ios_data,:email_favorites]
      # before_action :set_community, only: :email_favorites
      before_action :set_tour_user, only: :tour_user_login
      before_action :set_community_tour_user, only: :tour_user_login
      include ApplicationHelper
      include StripeServices
      require 'securerandom'
    
      def save_user_data
        has_access = (api_access || grant_access(decoded(params[:token]), params[:tour_user_id])) rescue false

        if has_access
          tempFile = params[:image]
          unless params[:tour_user_id].present? && params[:tour_stop_id].present? && params[:tour_id].present?
            render :json => { :success => false, :message => "Please enter tour user id, tour stop id or tour id" }
          else
            begin
              unless (params[:tour_stop_id].to_i == params[:tour_id].to_i)
                vs = VisitedStop.create!(tour_user_id: params[:tour_user_id].to_i, tour_stop_id: params[:tour_stop_id].to_i, tour_id: params[:tour_id].to_i, image: tempFile, description: params[:description].present? ? params[:description] : nil, device_id: params[:device_id], tour_key: params[:tour_key], is_rotated: false, event_time: params[:event_dateTime].present? ? DateTime.parse(params[:event_dateTime]).strftime('%a, %d %b %Y %H:%M:%S') : nil, event_date: params[:event_dateTime].present? ? DateTime.parse(params[:event_dateTime]).strftime('%a, %d %b %Y %H:%M:%S') : nil)
              end
            rescue => ex
              render :json => { :success => false, :message => "failed" }
            end
            if vs.present?
              render :json => { :success => true, :message => "success" }
            else
              render :json => { :success => false, :message => "failed" }
            end
          end
        end
      end
    
      def save_user_selfie
        has_access = (api_access || grant_access(decoded(params[:token]), params[:tour_user_id])) rescue false
    
        if has_access
          tempFile = params[:image]
          unless params[:tour_user_id].present? && params[:image].present?
            render :json => { :success => false, :message => "Please enter tour user id, image" }
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
                DelayedSchedulerMailerJob.perform_async("ID / Selfie Matching (Manual)", email_content, 'jennifer@pynwheel.com',community,nil,nil,nil,nil,false,nil) unless params[:local_testing].present?
                community.email.split(',').each do |email|
                  DelayedSchedulerMailerJob.perform_async("ID / Selfie Matching (Manual)", email_content, email,community,nil,nil,nil,nil,false,nil) unless params[:local_testing].present?
                end
              end
              puts "<<<<<<<<<<<<<<<<<<<<<<<<< #{vs.valid?}"
              vs.save!(validate: false)
            rescue => ex
              puts "<<<<<<<<<<<<<<<<<<<<<<<<< #{ex.message}"
              render :json => { :success => false, :message => "failed" } and return
            end
            if vs.present?
              render :json => { :success => true, :message => "success" } and return
            else
              render :json => { :success => false, :message => "failed" } and return
            end
          end
        end
      end
    
      def save_user_id_card
        has_access = (api_access || grant_access(decoded(params[:token]), params[:tour_user_id])) rescue false
        
        if has_access
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
            render :json => { :success => success, :message => message }
          end
        end
      end
    
      def save_user_tour
        has_access = (api_access || grant_access(decoded(params[:token]), params[:tour_user_id])) rescue false
        
        if has_access
          unless params[:tour_user_id].present? && params[:tour_stop_id].present? && params[:tour_id].present?
            render :json => { :success => false, :message => "Please enter tour user id, tour stop id or tour id" }
          else
            arr = []
            stops = params[:tour_stop_id].split(',')
            begin
              a1 = TourUser.find params[:tour_user_id].to_i
              a2 = Tour.find params[:tour_id].to_i
              
              timezone = a2.community.get_time_zone()
            rescue => ex
            end
            stops.each do |stop_id|
              begin
                s_id , dateTime, stop_type, stop_pin = stop_id.split('|')
                a3 = TourStop.find s_id.to_i
                begin
                  _date = dateTime.present? ? DateTime.parse(dateTime).in_time_zone(timezone).strftime('%a, %d %b %Y %H:%M:%S') : nil
                rescue Exception => e
                  _date = dateTime.present? ? DateTime.parse(dateTime).strftime('%a, %d %b %Y %H:%M:%S') : nil
                end
              rescue => ex
              end
              if a1.present? && a2.present? && a3.present?
                unless (stop_id.to_i == params[:tour_id].to_i)
                  vs_ = VisitedStop.find_by(tour_user_id: params[:tour_user_id].to_i,tour_stop_id: stop_id.to_i,tour_id: params[:tour_id].to_i, tour_key: params[:tour_key], event_date: _date, event_time: _date.to_s.split(" ").last,stop_type: stop_type)
                  vs = VisitedStop.create(tour_user_id: params[:tour_user_id].to_i,tour_stop_id: stop_id.to_i,tour_id: params[:tour_id].to_i, device_id: params[:device_id], tour_key: params[:tour_key], is_rotated: false, event_date: _date, event_time: _date,stop_type: stop_type, stop_pin: ( (stop_pin).gsub("Use code ","").gsub(" to enter.","").gsub("# to enter.","") rescue "")) unless vs_.present?
                end
              end
              if vs.present?
                arr << true
              else
                arr << false
              end
            end
    
            @tour_user = TourUser.find(params[:tour_user_id]) if params[:tour_user_id].present?
            feedback = Feedback.where(tour_user_id: @tour_user.id).last
            show_feedback = if feedback.present? and feedback.is_cancelled == false
              false
            elsif feedback.present? and feedback.is_cancelled and feedback.cancelled_at.present? and (feedback.cancelled_at > 24.hours.ago)
              false
            else
              true
            end
            render :json=> {:success=>true, :message => "success", :data => arr, :feedback_option => show_feedback}
    
          end
        end
      end
    
      def feedback 
        feedback = Feedback.where(tour_user_id: params['tour_user_id']).last
        if !feedback.present? || (feedback and feedback.is_cancelled and feedback.cancelled_at and feedback.cancelled_at < 24.hours.ago)
          @feedback = Feedback.create(feedback_params) unless feedback.present?
          updated_feedback = Feedback.find_by(tour_user_id: params['tour_user_id'])
          updated_feedback.update(feedback_params) if feedback.present?
          if @feedback || updated_feedback
            render json: { success: true, error_code: 200, message: "Feedback submitted successfully", data: @feedback ? @feedback : updated_feedback}
          else
            render json: { success: false, error_code: 400, message: "Something went wrong, please try again later", data: nil }
          end
        else
          render json: { success: false, error_code: 400, message: "You already have been submitted feedback"}
        end
      end
      def start_tour_auto_message
        begin
          app_link = params[:company_name].downcase == "lincoln" ? "http://onelink.to/6fsxvq" : "http://onelink.to/m5vuhn" rescue "https://apps.apple.com/us/app/self-tour/id1488907392"
          android_link = params[:company_name].downcase == "lincoln" ? "https://play.google.com/store/apps/details?id=com.pynwheel.lincolnselftour" : "https://play.google.com/store/apps/details?id=com.pynwheel.selftour" rescue "https://play.google.com/store/apps/details?id=com.pynwheel.selftour"
    
          if params[:access_token] == ENV["FEEDBACK_TOKEN"]
            to = params[:phone_number]
            start_tour_auto_msg = "Thank you for choosing to tour our property!
    click here to start your tour.
    iPhone Users:
    #{app_link}"
    
            TwilioSmsWorker.perform_async(start_tour_auto_msg, to)

            render :json => { :success => true, :message => "Message Sent" }
          else
            render :json => { :success => false, :message => "Message Not Sent", :error => "Invalid Token" }
          end
        rescue => ex
          render :json => { :success => false, :message => "Message Not Sent", :error => ex }
        end
      end
    
      def tour_user_login
        unless @tour_user.present?
          @tour_user = create_new_tour_user
        end
    
        render :json => { :success => true, :message => "New User has been created successfuly!", tour_user: @tour_user, token: encoded(@tour_user), allowed_email: is_community_allows_user(@community, @tour_user) }
      end
    
      def save_shared_tour
        has_access = (api_access || grant_access(decoded(params[:token]), params[:tour_user_id])) rescue false
    
        if has_access
          shared_tour = SharedTour.new shared_tour_params
          if shared_tour.save
            tu = TourUser.find_by(id: params[:tour_user_id])
    
            # VisitedStop.where(tour_user_id: @tour_user.id, tour_id: tour.id,tour_key: tour_key,device_id: @device_id).group('tour_stop_id').count
            last_stop = VisitedStop.where(tour_user_id: params[:tour_user_id], tour_id: params[:tour_id]).last
            vs = VisitedStop.where(tour_id: params[:tour_id], tour_user_id: params[:tour_user_id], tour_key: last_stop.tour_key).group(:tour_stop_id).count
    
            description_arr = []
            gallery_arr = []
    
            visited_stops = []
            vs.delete(params[:tour_id]) rescue ""
            vs.keys.each { |x| visited_stops << TourStop.find_by_id(x) }
            visited_stops = visited_stops.compact rescue visited_stops
            community = visited_stops.last&.tour.community
            shared_tour_stops = {}
            stops = []
            visited_stops.compact.each_with_index do |x, i|
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
                shared_tour_stops[x.stop_id] = { stops: stop, description: description_arr, images: gallery_arr }
                
              end
            end

            begin
              shared_tour_stops.delete(params[:tour_id])
              FavoriteMailer.email_shared_tour([shared_tour.email], shared_tour_stops, community).deliver_now
            rescue => ex
              puts "Visited Stop #{ex} >>>>>>>>>>>>>>>>>>>>>>>>>"
              puts ex
            end
    
            email_content = "There are total tour stops, we need tour_user_id to get visited stops Please send that #{visited_stops.to_s}"
            render :json => { :success => true, :message => "success", :data => visited_stops }
          else
            render :json => { :success => false, :message => "shared tour was not saved, please try again." }
          end
        end
      end
    
      def floorplan_units
        has_access = (api_access || grant_access(decoded(params[:token]), params[:tour_user_id])) rescue false
    
        if has_access
          if params[:unit_id].present?
            unit = Unit.find_by_id(params[:unit_id])
            @community = Community.find unit.community_id
            @units = get_units_for_tour(unit)
    
            @units.each do |u|
              if u.community.is_sitemap?
                u.sitemap_image_url = u&.community&.sitemap&.image&.url rescue ""
                # u.sitemap_image_url = u.community.sitemap.image.url(:svg_for_metro).present? ? u.community.sitemap.
                #   image.url(:svg_for_metro) : u.community.sitemap.image.url rescue ""
                @sitemap_image_url = u.sitemap_image_url
    
              else
                floorplate = Floorplate.find_by_id(u.floorplate_id)
                floorplate_image = floorplate.image.url if floorplate.present?
                u.sitemap_image_url = floorplate_image
                @sitemap_image_url = floorplate_image
              end
              u.availability_url = u.get_availability_url()
            end
            success = true
            message = 'success'
            floorplate_image = unit.floorplate.present? ? unit.floorplate.image_url : "No Floorplate Image"
          else
            success = false
            message = 'Please provide unit_id'
          end
        end
      end
    
      def floorplan_list
        has_access = (api_access || grant_access(decoded(params[:token]), params[:tour_user_id])) rescue false
        
        if has_access
          @community = Community.find params[:community_id]
          units = @community.units.where(available: true)
          floorplans = []
          
          units.each do |u|
            floorplans << u.floorplan
          end
    
          @floorplans = floorplans.present? ? floorplans.uniq.compact.sort_by { |f| f.bedrooms } : []
        end
      end
    
      def floorplan_units_v1
        has_access = (api_access || grant_access(decoded(params[:token]), params[:tour_user_id])) rescue false
    
        if has_access
          if params[:floorplan_id].present?
            floorplan = Floorplan.find_by_id(params[:floorplan_id])
            @community = Community.find params[:community_id]
            @units = get_units_for_tour(floorplan) 

            @units.each do |u|
              if u.community.is_sitemap?
                u.sitemap_image_url = u&.community&.sitemap&.image&.url rescue ""
                @sitemap_image_url = u.sitemap_image_url
    
              else
                floorplate = Floorplate.find_by_id(u.floorplate_id)
                floorplate_image = floorplate.image.url if floorplate.present?
                u.sitemap_image_url = floorplate_image
                @sitemap_image_url = floorplate_image
              end
              u.availability_url = u.get_availability_url()
            end
            success = true
            message = 'success'
            floorplate_image = (@units.first.floorplate.present? ? @units.floorplate.image_url : "No Floorplate Image" rescue "")
          else
            success = false
            message = 'Please provide unit_id'
          end
          # unless params[:stringFormat].present? && params[:stringFormat] == "true"
          #   render :json=> {:success=>success, :message => message, :data => @units ||= {}, :floorplate_image => floorplate_image }
          # end
        end
      end
      def mis_match_verification
        has_access = (api_access || grant_access(decoded(params[:token]), params[:tour_user_id])) rescue false
        
        begin
          if has_access
            @tour_user = TourUser.find params[:tour_user_id]
            name = @tour_user.name
            @community = Community.find params[:community_id]
            reason = "<br><br>#{(get_reason params[:verificaion_provider], params[:verification_code], params[:anti_spoofing], params[:confidence])}"
            email_content = "#{name} visiting #{@community.name} was unable to begin the tour because of an issue with ID verification." + reason
            emails = @community.email.gsub(" ","").split(',')
            emails.each do |email|
              DelayedSchedulerMailerJob.perform_async("ID Verification Issue for #{name}", email_content, email,@community,nil,nil,nil,nil,false,nil)
            end
            render :json => { :success => true, :message => "success" }
          else
            render :json => { :success => false, :message => "Invalid Token" }
          end
        rescue => ex
          render :json => { :success => false, :status => 500, :message => ex }
        end
      end
    
      def get_reason verificaion_provider, verification_code, anti_spoofing, confidence
        if verificaion_provider == "check_point_id"
          if verification_code == "MultipleErrors" || verification_code == "ValidationError" || (anti_spoofing.present? && anti_spoofing.to_i < 80) || (confidence.present? && confidence.to_i < 55)
            "The Face has not been matched"
          elsif verification_code == "MRZOCRError" || verification_code == "MRZInNotPresentError"
            "Unable to capture mrz from the image of the document."
          else
            ""
          end
        else
          ""
        end
    
      end
    
      def save_tour_user_card_info
        has_access = (api_access || grant_access(decoded(params[:token]), params[:tour_user_id])) rescue false
        
        if has_access
          if params[:tour_user_id].present? && TourUser.find_by(id: params[:tour_user_id]).present?
            begin
              response = Stripe::Token.create({
                                                card: {
                                                  number: params[:number].to_s,
                                                  exp_month: params[:exp_month].to_i,
                                                  exp_year: params[:exp_year].to_i,
                                                  cvc: params[:cvc].to_s,
                                                },
                                              })
              
                                    
              tu = TourUser.find(params[:tour_user_id]) 
              customer_id =  create_customer(tu.email, response[:id]).id
              tu.update(strip_customer_id: customer_id, card_last_digits: response[:card][:last4])
    
              render :json => { :success => true, :message => "Tour User Card Information Saved Successfully" }
            rescue Stripe::CardError => e
              render :json => { :success => false, :message => "#{e.error.message}" }
            end
          else
            render :json => { :success => false, :message => "Invalid Tour User Id" }
          end
        else
          render :json => { :status => false, :message => "Invalid Token" }
        end
      end
    
      private
    
      def create_new_tour_user
        TourUser.create(
          email: params[:email].downcase, 
          name: "#{params[:first_name]} #{params[:last_name]}", 
          first_name: params[:first_name], 
          last_name: params[:last_name], 
          phone_number: params[:phone_number], 
          id_selfie_mismatch: false, 
          is_authentiq_verified: false, 
          is_checkpoint_verified: false, 
          authentiq_verified_at: nil, 
          checkpoint_verified_at: nil, 
          is_sms_enabled: params[:is_sms_enabled]
        )
      end
    
      def is_community_allows_user community, tour_user, allow = true
        if community.present? and community.restrict_access
          allow = false unless community.allowed_emails.pluck(:email).include?(tour_user.email.downcase)
        end     
    
        allow
      end
    
      def set_tour_user
        @tour_user = TourUserSearcherService.new(params[:phone_number], params[:email].downcase).find_tour_user()
    
        if @tour_user.present?
          @tour_user.update(
            name: "#{params[:first_name]} #{params[:last_name]}",
            last_name: params[:last_name],
            first_name: params[:first_name],
            phone_number: params[:phone_number].present? ? params[:phone_number] : @tour_user.phone_number,
            email: params[:email].present? ? params[:email].downcase : @tour_user.email
          )
        end
      end

      def get_units_for_tour(entity)
        if entity.present?
          units = Unit.where(
            floorplan_id: entity.is_a?(Floorplan) ? entity.provider_floorplan_id : entity.floorplan_id,
            community_id: @community.id,
            available: true
          ).visible_units

          units
        else
          []
        end
      end

      def set_community_tour_user
        @community ||= Community.find_by_id params[:community_id]
      end
    
      def share_tour_data
        st = SharedTour.joins(:tour => [:tour_stops, :community])
      end
    
      def set_community
        @community = Community.find(params[:id])
      end
    
      def shared_tour_params
        params.permit(:name, :phone, :email, :tour_id, :recipient_name)
      end
    
      def feedback_params
        params.permit(:comment, :rating, :tour_id, :tour_user_id, :is_cancelled, :cancelled_at)
      end
      
    end
  end
end
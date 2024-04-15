module Api
  module V1
    class TourHistoriesController < BaseController

      include ApplicationHelper
      require 'securerandom'
      before_action :set_tour_user, only: [:verify_property_access_code]
      before_action :set_community, only: [:verify_property_access_code]
    
      def save_tour_history
        has_access = (api_access || grant_access(decoded(params[:token]), params[:tour_user_id])) rescue false
        if has_access
          if params[:community_id].present? && params[:tour_user_id].present?
            params[:id].present? ? tour_history = TourHistory.find_or_create_by(id: params[:id]) : tour_history = TourHistory.new
            community = set_community
            tour_history.arrived = convert_epoch_to_datetime params[:arrived] if params[:arrived].present?
            tour_history.left = convert_epoch_to_datetime params[:left] if params[:left].present?
            tour_history.tour_state = "completed" if params[:left].present?
            tour_history.tour_type = params[:tour_session_type] if params[:tour_session_type].present?
            tour_history.community_id = params[:community_id]
            tour_history.community_time_zone = community.get_time_zone()
            if  params[:tour_site].present?
              if params[:tour_site] == "self_tour" || params[:tour_site] == "guided_tour"
                tour_history.tour_site = "onsite"
              elsif params[:tour_site] == "virtual_tour"
                tour_history.tour_site = "offsite"
              end
            end
            tour_history.tour_id = params[:tour_id].to_i if params[:tour_id].present?
            tour_history.lengthy_stay = convert_epoch_to_datetime params[:lengthy_stay] if params[:lengthy_stay].present?
            if params[:time_zone].present?
              tour_history.my_time_zone = params[:time_zone].to_s rescue nil
            end
            save_visitedStops params  if params[:tour_stop_id].present?
            
            tour_history.abandoned_tour_at_stop = params[:abandoned_tour_at_stop]
            tour_history.active_app = params[:active_app] if params[:active_app].present?
            tour_history.tour_user_id = params[:tour_user_id]
    
            tour_history.see_availability_counter = params[:see_availability_counter].to_i if params[:see_availability_counter].present?
            tour_history.apply_click_counter = params[:apply_clicks_counter].to_i if params[:apply_clicks_counter].present?
            tour_history.price_opened_counter = params[:price_opened_counter].to_i if params[:price_opened_counter].present?
            tour_history.notes_opened_counter = params[:notes_opened_counter].to_i if params[:notes_opened_counter].present?
            tour_history.camera_opened_counter = params[:camera_opened_counter].to_i if params[:camera_opened_counter].present?
            tour_history.visited_pages_counter = params[:visited_pages_counter].to_i if params[:visited_pages_counter].present?
    
            @tour = Tour.find params[:tour_id]
            tu = TourUser.find params[:tour_user_id]
            tour_history.latitude = tu.latitude rescue nil
            tour_history.longitude = tu.longitude rescue nil
            begin
              tu = TourUser.find params[:tour_user_id]
              if !community.community_tour.visual_id_verification
                tu.id_selfie_mismatch = false
              end
              tour_history.verified_by = tu.verified_by
              tour_history.desired_bedroom = tu.desired_bedroom
              tour_history.latitude = tu.latitude
              tour_history.longitude = tu.longitude
              tour_history.tour_key = tu.tour_key
              tour_history.tour_status = tu.tour_type
              tour_history.lock_access_time = tu.lock_access_time
          
              tu.save
            rescue => ex
            end
            tour_history.id_mismatch = tour_history.tour_user.id_selfie_mismatch rescue false
            
            tour_history.community = set_community
            chatroom = Chatroom.find_by(tour_user_id: params[:tour_user_id], tour_id: params[:tour_id])
            if chatroom.present?
              if params[:last_msg_id].present?
                count = Chat.where("name = ? AND chatroom_id = ? AND id > ?", "Support Team", chatroom.id, params[:last_msg_id]).count
              else
                count = 0
              end
            else
              count = 0
            end
            if tour_history.save
              render :json=> {:success=>true, :message => "success", :un_read_msgs_count=> count, :data => tour_history}
            else
              render :json=> {:success=>false, :message => "tour history was not saved, please try again."}
            end
          else
            render :json=> {:success=>false, :message => "Please provide community_id."}
          end
        end
      end
    
      def verify_property_access_code
        has_access = (api_access || grant_access(decoded(params[:token]), params[:tour_user_id])) rescue false
        if has_access
          access_code = params[:access_code] rescue ""
          is_property_access_enabled = @community&.community_tour&.tour_setting&.enable_restricted_property_access
          tour_length_stay_limit = @community&.community_tour&.tour_setting&.length_stay_limit
          if @tour_user.property_access_code_verification(access_code,is_property_access_enabled,tour_length_stay_limit)
            @tour_user.update_columns(restricted_property_access: false)
            render :json=> {success: true, error_code: 200, message: "Code has been verified successfully."}
          else
            @tour_user.update_columns(restricted_property_access: true)
            render json: {success: false, error_code: 400, message: @tour_user.errors.full_messages.first, result: nil}
          end
        end
      end
    
      def save_visitedStops params
        arr = []
        stops = params[:tour_stop_id].split(',')
        begin
          a1 = TourUser.find params[:tour_user_id].to_i
          a2 = Tour.find params[:tour_id].to_i
        rescue => ex
        end
        stops.each do |stop_id|
          begin
            s_id , dateTime, stop_type, stop_pin = stop_id.split('|')
            a3 = TourStop.find s_id.to_i
            _date = dateTime.present? ? DateTime.parse(dateTime).strftime('%a, %d %b %Y %H:%M:%S') : nil
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
      end
    
      def alerts_during_tour
        has_access = (api_access || grant_access(decoded(params[:token]), params[:tour_user_id])) rescue false
        if has_access
          if params[:community_id].present? && params[:tour_id].present? && params[:tour_user_id].present?
            id_mismatch = false
            community = set_community
    
            unless community.community_tour.visual_id_verification
              begin
                tu = TourUser.find params[:tour_user_id]
                tu.id_selfie_mismatch = false
                id_mismatch = tu.id_selfie_mismatch
                tu.save
              rescue => ex
              end
            else
              begin
                tu = TourUser.find params[:tour_user_id]
                id_mismatch = tu.id_selfie_mismatch
              rescue => ex
              end
            end
    
            check_length_stay(params[:tour_history_id], params[:lengthy_stay], community, tu, params[:current_stop_id]) if (params[:tour_history_id].present? and params[:lengthy_stay].present?)
            chat_control = (community.chat_control and community.is_chat_available) ? community.chat_control : false
            has_tour_user_left(community, tu, params[:lat_langs].last) if params[:lat_langs].present?
            chatroom = Chatroom.find_by(tour_user_id: params[:tour_user_id], tour_id: community.community_tour.id)
            if chatroom.present?
              if params[:last_msg_id].present?
                count = Chat.where("name = ? AND chatroom_id = ? AND id > ?", "Support Team", chatroom.id, params[:last_msg_id]).count
              else
                count = 0
              end
            else
              count = 0
            end
            render :json=> {:success=>true, :message => "success", :un_read_msgs_count=> count, :id_mismatch=> id_mismatch, chat_control: chat_control}
          else
            render :json=> {:success=>false, :message => "Please provide community_id, tour_id and tour_user_id"}
          end
        else
          render :json=> {:success=>false, :message => "Invalid Token"}
        end
      end
    
      def check_length_stay(tour_history_id, lengthy_stay, community, tu, stop_id)
        tour_history = TourHistory.find_by_id tour_history_id
        return unless tour_history.present?
    
        lengthy_stay = (convert_epoch_to_datetime lengthy_stay.to_s)
        stay_time = time_difference(lengthy_stay, tour_history.arrived)
        
        if (community&.community_tour&.tour_setting && stay_time > community&.community_tour&.tour_setting&.length_stay_limit) && tour_history&.lengthy_stay_email_sent == false && tour_history&.tour_status == "self_tour"
          stop = TourStop.find_by_id stop_id
          at_stop = stop.present? ? stop.name : community.name
          
          # contact_user = (tu.phone_number.present? ? ("<br><br><b>Want to check in with them? " + tu.phone_number) + "<b>" : (community.chat_control ? ("#{tu.phone_number.present? ? "<br>Or" : ""}<br><br><b>Want to check in with them?  <a href='" + base_url+"companies/#{community.company.id}/communities/#{community.id}/edit?tour_user_id=#{tu.id}" + "'>Open Chat</a>" ) : "")
          phone_number = tu.phone_number.last(10).gsub(/^(\d{3})(\d+)(\d{4})$/, '\1-\2-\3') rescue ""
          phone_number_text = phone_number.present? ? ("<br><br><b>Want to check in with them? " + "<a href='tel:" + phone_number + "'> " + phone_number + " <a>" + "<b>") : ""
          contact_user = (phone_number_text + (community.chat_control ? ("#{tu.phone_number.present? ? "<br><br>Or" : ""}<br><br><b>Want to check in with them?  <a href='" + base_url+"companies/#{community.company.id}/communities/#{community.id}/edit?tour_user_id=#{tu.id}" + "'>Open Chat</a>" ) : ""))
    
          @mail_content = ["lengthy_stay", "#{tu.name.titleize} has been on a Self Tour at #{community.name} for #{stay_time} minutes. They are currently at #{at_stop}. #{contact_user}</b>"] #get_alert_message('lengthy_stay')
          tour_history.update_column 'lengthy_stay_email_sent',true
    
          emails = community.email.gsub(" ","").split(',')
          schedule_tour = community.schedual_tours.where(tour_user_id: tu.id).last rescue nil
          
          unless tu.is_virtual_tour?
            emails.each do |email|
              NotificationMailer.tour_history_mail(@mail_content[0].humanize, @mail_content[1], email,"info@pynwheel.com",community,false,schedule_tour).deliver
            end
          end
    
        end
      end
    
      def has_tour_user_left(community, tu, lat_long)
        if(tu.arrival_email_sent and lat_long.present? and geo_distance(lat_long[:lat],lat_long[:lng],community.latitude, community.longitude, 1)  )
          emails = community.email.gsub(" ","").split(',')
          schedule_tour = community.schedual_tours.where(tour_user_id: tu.id).last rescue nil
          
          unless tu.is_virtual_tour?
            emails.each do |email|
              NotificationMailer.tour_history_mail("Visitor has departed", "#{tu.name.titleize}  has left #{community.name}", email,"info@pynwheel.com",community,false,schedule_tour).deliver
              tu.update_column 'arrival_email_sent' , false 
            end
          end
    
        end
      end
    
      def geo_distance(lat1,long1,lat2,long2,limit)
        return ((Geocoder::Calculations.distance_between([lat1,long1],[lat2,long2],options = {:units => :km}) > limit) rescue true)
      end
    
      def time_difference(lengthy_stay, arrival_time)
        ((lengthy_stay - arrival_time) / 1.minute).round
      end
    
      def change_id_selfie_status
        has_access = (api_access || grant_access(decoded(params[:token]), params[:tour_user_id])) rescue false
        if has_access
          if params[:tour_user_id].present? && params[:id_selfie_mismatch_status].present?
            
            tour_user = TourUser.find_by_id(params[:tour_user_id])
            if tour_user.present?
              tour_user.id_selfie_mismatch = params[:id_selfie_mismatch_status]
              if tour_user.save
                render :json=> {:success=>true, :message => "status changed"}
              else
                render :json=> {:success=>false, :message => "tour user status was not changed."}
              end
            else
              render :json=> {:success=>false, :message => "tour user was not found against this id, please try again."}
            end
    
          else
            render :json=> {:success=>false, :message => "tour_user_id and id_selfie_mismatch_status are compulsory."}
          end
        end
      end
    
      def get_tour_history
    
        tour_history = TourHistory.find_by(id: params[:id])
        all_ids = TourHistory.pluck :id
        if tour_history.present?
          render :json=> {:success=>true, :message => "success", :data => tour_history}
        else
          render :json=> {:success=>false, :message => "tour history was not found against this id, please try again.", available_ids: all_ids}
        end
      end
    
      private
    
      def base_url
        Rails.env.development? ? "localhost:3000/" : (ENV["RAILS_ENV"] == "staging" ? "https://pynwheel-staging.herokuapp.com/" : "https://pynwheelapp.com/") 
      end
    
      def convert_epoch_to_datetime epoch_str
        Time.strptime(epoch_str, '%s')
      end
      
      def tour_history_params
        params.permit(:arrived, :left, :lengthy_stay, :id_mismatch, :abandoned_tour_at_stop, :tour_user_id, :community_id)
      end
    
      def set_community
        @community ||= Community.find_by_id params[:community_id] if params[:community_id].present?
      end
    
      def set_tour_user
        @tour_user ||= TourUser.find_by_id params[:tour_user_id] if params[:tour_user_id].present?
      end

    end
  end
end
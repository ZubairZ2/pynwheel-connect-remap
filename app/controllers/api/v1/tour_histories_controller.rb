class Api::V1::TourHistoriesController < ActionController::Base
  include ApplicationHelper
  require 'securerandom'
  def save_tour_history
    puts params
    access = grant_access (decoded(params[:token])) rescue false
    if api_access or access == true
      if params[:community_id].present? && params[:tour_user_id].present?
        params[:id].present? ? tour_history = TourHistory.find_or_create_by(id: params[:id]) : tour_history = TourHistory.new

        tour_history.arrived = convert_epoch_to_datetime params[:arrived] if params[:arrived].present?
        tour_history.left = convert_epoch_to_datetime params[:left] if params[:left].present?
        tour_history.tour_id = params[:tour_id].to_i if params[:tour_id].present?
        tour_history.lengthy_stay = convert_epoch_to_datetime params[:lengthy_stay] if params[:lengthy_stay].present?
        if params[:time_zone].present?
          tour_history.my_time_zone = params[:time_zone].to_s rescue nil
        end
        tour_history.abandoned_tour_at_stop = params[:abandoned_tour_at_stop] if params[:abandoned_tour_at_stop].present?
        tour_history.active_app = params[:active_app] if params[:active_app].present?
        tour_history.tour_user_id = params[:tour_user_id]
        @tour = Tour.find params[:tour_id]

        tu = TourUser.find params[:tour_user_id]
        tour_history.latitude = tu.latitude rescue nil
        tour_history.longitude = tu.longitude rescue nil
        begin
          tu = TourUser.find params[:tour_user_id]
          if !@tour.visual_id_verification
            tu.id_selfie_mismatch = false
          end
          tour_history.verified_by = tu.verified_by
          tour_history.desired_bedroom = tu.desired_bedroom
          tour_history.latitude = tu.latitude
          tour_history.longitude = tu.longitude
          tour_history.tour_key = tu.tour_key
          tour_history.tour_status = tu.tour_type
      
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

  def alerts_during_tour
    access = grant_access (decoded(params[:token])) rescue false
    if api_access or access == true
      if params[:community_id].present? && params[:tour_id].present? && params[:tour_user_id].present?
        id_mismatch = false
        tour = Tour.find params[:tour_id]
        unless tour.visual_id_verification
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

        check_length_stay(params[:tour_history_id], params[:lengthy_stay], tour.community, tu, params[:current_stop_id]) if (params[:tour_history_id].present? and params[:lengthy_stay].present?)
        chat_control = (tour.community.chat_control and tour.community.is_chat_available) ? tour.community.chat_control : false
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

        render :json=> {:success=>true, :message => "success", :un_read_msgs_count=> count, :id_mismatch=> id_mismatch, chat_control: chat_control}
      else
        render :json=> {:success=>false, :message => "Please provide community_id, tour_id and tour_user_id"}
      end
    else
      render :json=> {:success=>false, :message => "Invalid Token"}
    end
  end
  def check_length_stay(tour_history_id, lengthy_stay, community, tu, stop_id)
    tour_history = TourHistory.find tour_history_id
    lengthy_stay = (convert_epoch_to_datetime lengthy_stay.to_s)
    stay_time = time_difference(lengthy_stay, tour_history.arrived)
    
    if stay_time > community.tour.tour_setting.length_stay_limit && tour_history.lengthy_stay_email_sent == false && tour_history.tour_status == "self_tour"
      stop = TourStop.find stop_id
      # contact_user = (tu.phone_number.present? ? ("<br><br><b>Want to check in with them? " + tu.phone_number) + "<b>" : (community.chat_control ? ("#{tu.phone_number.present? ? "<br>Or" : ""}<br><br><b>Want to check in with them?  <a href='" + base_url+"companies/#{community.company.id}/communities/#{community.id}/edit?tour_user_id=#{tu.id}" + "'>Open Chat</a>" ) : "")
      phone_number = tu.phone_number.last(10).gsub(/^(\d{3})(\d+)(\d{4})$/, '\1-\2-\3') rescue ""
      phone_number_text = phone_number.present? ? ("<br><br><b>Want to check in with them? " + "<a href='tel:" + phone_number + "'> " + phone_number + " <a>" + "<b>") : ""
      contact_user = (phone_number_text + (community.chat_control ? ("#{tu.phone_number.present? ? "<br><br>Or" : ""}<br><br><b>Want to check in with them?  <a href='" + base_url+"companies/#{community.company.id}/communities/#{community.id}/edit?tour_user_id=#{tu.id}" + "'>Open Chat</a>" ) : ""))

      @mail_content = ["lengthy_stay", "#{tu.name.titleize} has been on a Self Tour at #{community.name} for #{stay_time} minutes. They are currently at #{stop.name}.#{contact_user}</b>"] #get_alert_message('lengthy_stay')
      tour_history.update_column 'lengthy_stay_email_sent',true

      emails = community.email.gsub(" ","").split(',')
      emails.each do |email|
        NotificationMailer.tour_history_mail(@mail_content[0].humanize, @mail_content[1], email,community,false).deliver
      end

    end
  end
  def time_difference(lengthy_stay, arrival_time)
    ((lengthy_stay - arrival_time) / 1.minute).round
  end
  def change_id_selfie_status
    puts params
    access = grant_access (decoded(params[:token])) rescue false
    if api_access or access == true
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
end
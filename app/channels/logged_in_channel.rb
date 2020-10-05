class LoggedInChannel < ApplicationCable::Channel
    def subscribed
        user_logged_in_for_current_community
    end


    def unsubscribed
        user_logged_out_for_current_community
    end

    def user_logged_in_for_current_community
        community = Community.find_by_id params[:community_id].to_i
        community.update_columns(is_chat_login: true) if community.present?

        connections = connections_info
        total_listeners = connections.map{|connection| connection[:current_user].id}.uniq.count

        puts '----------------------'
        a = "total subscribers are " + total_listeners.to_s
        puts a
        puts '----------------------'
    end

    def user_logged_out_for_current_community
        connections = connections_info
        total_listeners = connections.map{|connection| connection[:current_user].id}.uniq.count

        puts '***********************'
        a = "remaing subscribers are " + total_listeners.to_s
        puts a
        puts '***********************'

        community = Community.find_by_id params[:community_id].to_i
        community.update_columns(is_chat_login: false) if community.present? and total_listeners == 0
    end
end

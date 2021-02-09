class LoggedInChannel < ApplicationCable::Channel
    def subscribed
        user_logged_in_for_current_community

        # if community.is_chat_available
            # reject
        # else
            # user_logged_in_for_current_community
        # end
    end

    def unsubscribed
        user_logged_out_for_current_community
    end

    def user_logged_in_for_current_community

        logged_in_user = LoggedInUser.find_or_create_by(user_id: current_user.id, community_id: params[:community_id].to_i, session_id: params[:session_id])
        
        if logged_in_user.logged_in_count  > 0 and Community.find_by(id: params[:community_id].to_i).is_chat_available == false
            logged_in_user.logged_in_count = 0
        end
        Community.find_by(id: params[:community_id].to_i).update_columns(is_chat_available: true)  if logged_in_user.logged_in_count == 0

        logged_in_user.with_lock do
            logged_in_user.update_columns(logged_in_count: logged_in_user.logged_in_count+1)
            all_users_count = LoggedInUser.where(community_id: params[:community_id].to_i).map{|u| u.logged_in_count}.sum

            subscribers = "total subscribers are " + all_users_count.to_s
        end

        # connections = connections_info
        # subscribers = connections.map{|connection| connection[:current_user].id}.uniq.count


    end

    def user_logged_out_for_current_community
        # connections = connections_info
        # subscribers = connections.map{|connection| connection[:current_user].id}.uniq.count

        logged_in_user = LoggedInUser.find_by(user_id: current_user.id, community_id: params[:community_id].to_i, session_id: params[:session_id])
        if logged_in_user.present?
            logged_in_user.with_lock do
                begin
                    logged_in_user.update_columns(logged_in_count: logged_in_user.logged_in_count-1) if logged_in_user.logged_in_count > 0
                    all_users_count = LoggedInUser.where(community_id: params[:community_id].to_i).map{|u| u.logged_in_count}.sum
                    Community.find_by(id: params[:community_id].to_i).update_columns(is_chat_available: false) if all_users_count == 0

                    subscribers = "remaing subscribers are " + all_users_count.to_s
                rescue
                    puts "User logged out and records are deleted"
                end
            end
        end
    end
    
end

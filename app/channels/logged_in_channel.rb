class LoggedInChannel < ApplicationCable::Channel
#     def subscribed
#         user_activated

#         # if community.is_chat_login
#             # reject
#         # else
#             # user_logged_in_for_current_community
#         # end
#     end

#     def unsubscribed
#         user_logged_out_for_current_community
#     end

#     def user_activated

#         logged_in_user = LoggedInUser.find_or_create_by(user_id: current_user.id, browser_id: params[:browser_id])
        
#         logged_in_user.logged_in_count = 0 if logged_in_user.logged_in_count > 0 and Community.joins(:users).where(users: {id: current_user.id}).where(community_users: {chat_enable: true}).pluck(:is_chat_login).uniq == [false]     # if somehow is_chat_login for user chat_enabled_comuunities is false but somehow logged_in count becomes > 0 (rescued)
#         Community.joins(:users).where(users: {id: current_user.id}).where(community_users: {chat_enable: true}).update_all(is_chat_login: true) if logged_in_user.logged_in_count == 0

#         logged_in_user.with_lock do
#             logged_in_user.update_columns(logged_in_count: logged_in_user.logged_in_count+1)
#             # all_users_count = LoggedInUser.where(community_id: params[:community_id].to_i).map{|u| u.logged_in_count}.sum

#             # subscribers = "total subscribers are " + all_users_count.to_s
#             # puts '----------------------'
#             # puts subscribers
#             # puts '----------------------'
#         end

#         # connections = connections_info
#         # subscribers = connections.map{|connection| connection[:current_user].id}.uniq.count


#     end

#     def user_logged_out_for_current_community
#         # connections = connections_info
#         # subscribers = connections.map{|connection| connection[:current_user].id}.uniq.count
#         puts "in user_logged_out_for_current_community"

#         logged_in_user = LoggedInUser.find_by(user_id: current_user.id, browser_id: params[:browser_id])
#         if logged_in_user.present?
#             logged_in_user.with_lock do
#                 begin
#                     logged_in_user.update_columns(logged_in_count: logged_in_user.logged_in_count-1) if logged_in_user.logged_in_count > 0

#                     chat_enabled_communities_for_current_user = CommunityUser.where(user_id: current_user.id, chat_enable: true).pluck(:community_id).uniq   # current user's chat enabled communities
#                     chat_enabled_communities_for_current_user = [0] if chat_enabled_communities_for_current_user.length == 0
#                     chat_enabled_communities_for_logged_in_users = CommunityUser.joins("INNER JOIN logged_in_users ON logged_in_users.user_id = community_users.user_id").where("logged_in_users.logged_in_count > ? and community_users.chat_enable = ? and community_users.community_id  NOT IN  (?)", 0, true, chat_enabled_communities_for_current_user).pluck(:community_id).uniq

#                     req_communities =  LoggedInUser.where.not(browser_id: params[:browser_id]).blank? ? chat_enabled_communities_for_current_user : (chat_enabled_communities_for_current_user - chat_enabled_communities_for_logged_in_users)

#                     # all_users_count = LoggedInUser.where(community_id: cookies[:community_id].to_i).map{|u| u.logged_in_count}.sum
#                     if req_communities.length > 0
#                         offline_communties = CommunityUser.joins("INNER JOIN logged_in_users ON logged_in_users.user_id = community_users.user_id").where(logged_in_users: {logged_in_count: 0}).where(community_users: {chat_enable: true, community_id: req_communities}).pluck(:community_id).uniq
#                         Community.where(id: offline_communties).update_all(is_chat_login: false) if offline_communties.length > 0
#                         LoggedInUser.where(logged_in_count: 0).destroy_all
#                     end

#                     # all_users_count = LoggedInUser.where(community_id: params[:community_id].to_i).map{|u| u.logged_in_count}.sum
#                     # Community.find_by(id: params[:community_id].to_i).update_columns(is_chat_login: false) if all_users_count == 0

#                     # subscribers = "remaing subscribers are " + all_users_count.to_s
#                     # puts '***********************'
#                     # puts subscribers
#                     # puts '***********************'
#                 rescue
#                     puts "User logged out and records are deleted"
#                 end
#             end
#         end
#     end
    
end

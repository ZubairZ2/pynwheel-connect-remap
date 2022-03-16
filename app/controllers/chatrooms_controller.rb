class ChatroomsController < ApplicationController
    # include Error::ErrorHandler
    protect_from_forgery with: :null_session
    skip_before_action :verify_authenticity_token
    skip_before_action :authenticate_user!
    before_action :set_tour_user, only: [:create]

    def new
        @chatroom = Chatroom.new
    end

    def create
        tour = Community.find_by_id params[:community_id]
        chatroom = Chatroom.find_by(tour_user_id: params[:tour_user_id], tour_id: tour.id)
        if chatroom.present?
            messages = chatroom.chats.order(created_at: :desc)
            if messages.present?
                message_history = serailize_messages(messages)
                render json: {messages: message_history,chatroom_id: chatroom.id,  stats: :OK, code: 200 }
            else
                chat = chatroom.chats.create(name: "Support Team" , message: "Hello, how can we help you?" , client_date: DateTime.now.strftime("%a %b %d %Y %k:%M:%S"), tour_key: @tour_user.tour_key )
                message = serailize_message(chat)
                render json: {messages: message, chatroom_id: chatroom.id,  stats: :OK, code: 200 }
            end
        else
            chatroom = Chatroom.create(tour_user_id: params[:tour_user_id], tour_id: tour.id)
            chat = chatroom.chats.create(name: "Support Team" , message: "Hello, how can we help you?" , client_date: DateTime.now.strftime("%a %b %d %Y %k:%M:%S"), tour_key: @tour_user.tour_key )
            message = serailize_message(chat)
            render json: {messages: message, chatroom_id: chatroom.id,  stats: :OK, code: 200 }
        end
    end

    def show
        @chatroom = Chatroom.find(params[:id])
        render json: @chatroom.chats
    end

    def serailize_messages(messages)
        community = messages.first.chatroom.tour.community
        tour_user = messages.first.chatroom.tour_user

        msgs_arr = []
        messages.each do |msg|
            msg_obj = {}
            msg_obj[:_id] = msg.id
            msg_obj[:text] = msg.message
            msg_obj[:createdAt] = msg.client_date
            
            user_obj = {}
            if msg.name == "Support Team"
                user_obj[:_id] = 0  # support team id, no need of it
                user_obj[:name] = msg.name
                user_obj[:avatar] = community.self_tour_logo.present? ? community.self_tour_logo.url : (community.logo.present? ? community.logo.url : "/assets/logo-small.png")
            
            else
                user_obj[:_id] = msg.chatroom.tour_user_id
                user_obj[:name] = msg.name
                user_obj[:avatar] = tour_user.image.present? ? tour_user.image.url : "/assets/chat-tour-user.jpg"
            end
            
            msg_obj[:user] = user_obj
            msgs_arr << msg_obj
        end
        return msgs_arr
    end

    def serailize_message(message)

        msgs_arr = []

        msg_obj = {}
        msg_obj[:_id] = message.id
        msg_obj[:text] = message.message
        msg_obj[:createdAt] = message.client_date
        
        user_obj = {}
        if message.name == "Support Team"
            community = message.chatroom.tour.community
            user_obj[:_id] = 0  # support team id
            user_obj[:name] = message.name
            user_obj[:avatar] = community.logo.present? ? community.logo.url : "/assets/logo-small.png"
        
        else
            tour_user = message.chatroom.tour_user
            user_obj[:_id] = message.chatroom.tour_user_id
            user_obj[:name] = message.name
            user_obj[:avatar] = tour_user.image.present? ? tour_user.image.url : "/assets/chat-tour-user.jpg"
        end
        
        msg_obj[:user] = user_obj
        msgs_arr << msg_obj

        return msgs_arr
    end
    
    def notifications_by_chatroom(community,chatroom)
        all_community_members = community.users
        min_count = 99999
        all_community_members.each do |user|
          count = Chat.where("chatroom_id = ? AND  name != ? ", chatroom.id, "Support Team").unread_by(user).count
          if count < min_count
            min_count = count 
          end
        end  
        [chatroom.id , min_count]
    end

    private

    def set_tour_user
        @tour_user = TourUser.find_by_id params[:tour_user_id]
    end
end

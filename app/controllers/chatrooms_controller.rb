class ChatroomsController < ApplicationController
    protect_from_forgery with: :null_session
    skip_before_filter :authenticate_user!, :only => [:create,:show]

    def index
        @chatroom = Chatroom.new
        render :index, layout: false
    end

    def new
        @chatroom = Chatroom.new
    end

    def create
        chatroom = Chatroom.find_by(tour_user_id: params[:tour_user_id], tour_id: params[:tour_id])
        if chatroom.present?
            messages = chatroom.chats.order(created_at: :desc).limit(20)
            if messages.present?
                message_history = serailize_messages(messages)
                render json: {messages: message_history,chatroom_id: chatroom.id,  stats: :OK, code: 200 }
            else
                chat = chatroom.chats.create(name: "Support Team" , message: "Hello, how can we help you?" )
                message = serailize_message(chat)
                render json: {messages: message, chatroom_id: chatroom.id,  stats: :OK, code: 200 }
            end
        else
            chatroom = Chatroom.create(tour_user_id: params[:tour_user_id], tour_id: params[:tour_id])
            chat = chatroom.chats.create(name: "Support Team" , message: "Hello, how can we help you?" )
            message = serailize_message(chat)
            render json: {messages: message, chatroom_id: chatroom.id,  stats: :OK, code: 200 }
        end
    end

    def show
        @chatroom = Chatroom.find(params[:id])
        render json: @chatroom.chats
    end

    def serailize_messages(messages)

        msgs_arr = []
        messages.each do |msg|
            msg_obj = {}
            msg_obj[:_id] = msg.id
            msg_obj[:text] = msg.message
            msg_obj[:createdAt] = msg.client_date
            
            user_obj = {}
            if msg.name == "Support Team"
                community = message.chatroom.tour.community
                user_obj[:_id] = 0  # support team id
                user_obj[:name] = msg.name
                user_obj[:avatar] = community.logo.present? ? community.logo.url : 'https://media-exp1.licdn.com/dms/image/C4E0BAQF2vI6Vud9KMg/company-logo_200_200/0?e=2159024400&v=beta&t=JKGp_fdWXtyUaFDuqSkNe6uEBekaW0XmhTdleuxPYgo'
            
            else
                tour_user = message.chatroom.tour_user
                user_obj[:_id] = msg.chatroom.tour_user_id
                user_obj[:name] = msg.name
                user_obj[:avatar] = tour_user.image.present? ? tour_user.image.url : 'https://media-exp1.licdn.com/dms/image/C4E0BAQF2vI6Vud9KMg/company-logo_200_200/0?e=2159024400&v=beta&t=JKGp_fdWXtyUaFDuqSkNe6uEBekaW0XmhTdleuxPYgo'
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
            user_obj[:avatar] = community.logo.present? ? community.logo.url : 'https://media-exp1.licdn.com/dms/image/C4E0BAQF2vI6Vud9KMg/company-logo_200_200/0?e=2159024400&v=beta&t=JKGp_fdWXtyUaFDuqSkNe6uEBekaW0XmhTdleuxPYgo'
        
        else
            tour_user = message.chatroom.tour_user
            user_obj[:_id] = message.chatroom.tour_user_id
            user_obj[:name] = message.name
            user_obj[:avatar] = tour_user.image.present? ? tour_user.image.url : 'https://media-exp1.licdn.com/dms/image/C4E0BAQF2vI6Vud9KMg/company-logo_200_200/0?e=2159024400&v=beta&t=JKGp_fdWXtyUaFDuqSkNe6uEBekaW0XmhTdleuxPYgo'
        end
        
        msg_obj[:user] = user_obj
        msgs_arr << msg_obj

        return msgs_arr
    end

end

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
        chatroom = Chatroom.find_or_create_by(tour_user_id: params[:tour_user_id], tour_id: params[:tour_id])
        
        if chatroom.chats.present?
            messages = chatroom.chats.order(created_at: :desc).limit(20)
            res = json_responce messages
            render json: res
        else
            render json: {responce: "user have no message history yet"}
        end

    end

    def show
        @chatroom = Chatroom.find(params[:id])
        render json: @chatroom.chats
    end

    def json_responce(messages)

        msgs_arr = []
        messages.each do |msg|
        msg_obj = {}
        msg_obj[:_id] = msg.id
        msg_obj[:text] = msg.message
        msg_obj[:createdAt] = msg.created_at.strftime("%H:%M")

        user_obj = {}
        if msg.name == "Pusher support"
            user_obj[:_id] = 1
            user_obj[:name] = msg.name
            user_obj[:avatar] = 'https://ibb.co/F3JCMv8'
        
        else
            user_obj[:_id] = 6
            user_obj[:name] = msg.name
            user_obj[:avatar] = 'https://placeimg.com/140/140/any'
        end
        
        msg_obj[:user] = user_obj
        msgs_arr << msg_obj
        end
        return msgs_arr
    end

    def message_history
        chatroom = Chatroom.where(name: params[:name] ,email: params[:email]).last
        if params[:id] == "0"
        messages = chatroom.chats.order(created_at: :desc).limit(20)
        res = json_responce messages
        render json: res
        end
    end

    private
        def chatroom_params
            params.require(:chatroom).permit(:tour_user_id, :tour_id)
        end

end

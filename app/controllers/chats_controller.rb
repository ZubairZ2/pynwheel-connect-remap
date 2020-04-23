class ChatsController < ApplicationController
    protect_from_forgery with: :null_session
    skip_before_filter :authenticate_user!, :only => [:create,:show]


    def index
        @chatrooms = Chatroom.all
    end

    def create
        
        chat = Chat.new(message: params[:message], name: params[:name], chatroom_id: params[:chatroom_id])
        if chat.save
            res = json_responce chat
            render json: res
        end
        # respond_to do |format|
        #     if @chat.save
        #         format.json { render :show, status: :created, location: @chat }
        #     else
        #         format.json { render json: @chat.errors, status: :unprocessable_entity }
        #     end
        # end
    end

    def new
        @chat = Chat.new
    end

    def show
        @chats = Chat.where(chatroom_id: params[:id])
        
        respond_to do |format|
            if @chats
                format.json { render :chats, status: :ok }
            else
                format.json { render json: @chats.errors, status: :unprocessable_entity }
            end
        end
    end

    
    private

    def chat_params
        params.require(:chat).permit(:message, :name, :chatroom_id)
    end

    def json_responce(msg)

        msgs_arr = []

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
            user_obj[:_id] = msg.chatroom.tour_user_id
            user_obj[:name] = msg.chatroom.tour_user.name
            user_obj[:avatar] = 'https://placeimg.com/140/140/any'
        end
        
        msg_obj[:user] = user_obj
        msgs_arr << msg_obj
   
        return msgs_arr
    end
end

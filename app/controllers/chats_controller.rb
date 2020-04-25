class ChatsController < ApplicationController
    protect_from_forgery with: :null_session
    skip_before_filter :authenticate_user!, :only => [:create,:show, :listening_message]


    def index
        @chatrooms = Chatroom.all
    end

    def create
        if params[:tour_user_id].present?
            # message from tour user
            tour_user_name = (TourUser.find params[:tour_user_id]).name
            if tour_user_name.nil?
                tour_user_name = "You"
            end

            chat = Chat.new(message: params[:message], name: tour_user_name, chatroom_id: params[:chatroom_id])
            if chat.save
                message = serailize_message(chat)
                render json: {messages: message, chatroom_id: chat.chatroom_id, stats: :OK, code: 200}
            else
                render json: {messages: chat.full_messages.join(',') , stats: :Bad, code: 400}
            end
        else
            # message from support
            chat = Chat.new(chat_params)
            if chat.save
                message = serailize_message(chat)
                render json: {messages: message, chatroom_id: chat.chatroom_id, stats: :OK, code: 200}
            else
                render json: {messages: chat.full_messages.join(',') , stats: :Bad, code: 400}
            end
        end
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

    def listening_message
        chats = Chat.where("name = ? AND chatroom_id = ? AND id > ?", "Support Team", params[:chatroom_id], params[:last_msg_id]).order(created_at: :desc)
        if chats.present?
            message_history = serailize_messages(chats)
            render json: {messages: message_history,chatroom_id: params[:chatroom_id],  stats: :OK, code: 200 }
        else
            render json: {messages: [],chatroom_id: params[:chatroom_id], stats: :OK, code: 200}
        end

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

    private

    def chat_params
        params.require(:chat).permit(:message, :name, :chatroom_id, :client_date)
    end

end

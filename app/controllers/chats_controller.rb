class ChatsController < ApplicationController
    protect_from_forgery with: :null_session
    skip_before_action :authenticate_user!, :only => [:create,:show, :listening_message]
    before_action :set_tour_user, only: [:create]


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

            chat = Chat.new(message: params[:message], name: tour_user_name, chatroom_id: params[:chatroom_id], client_date: params[:client_date], tour_key: @tour_user.tour_key)
            if chat.save
                message = serailize_message(chat)
                render json: {messages: message, chatroom_id: chat.chatroom_id, stats: :OK, code: 200}
            else
                render json: {messages: chat.full_messages.join(',') , stats: :Bad, code: 400}
            end
        else
            # message from support
            chat = Chat.new(chat_params.merge(tour_key: @tour_user.tour_key))
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
        @chats = Chat.where(chatroom_id: params[:id]).order(id: :asc)
        respond_to do |format|
            if @chats
                format.json { render :chats, status: :ok }
            else
                format.json { render json: @chats.errors, status: :unprocessable_entity }
            end
        end
    end

    def listening_message
        begin
            community = Community.find params[:community_id]
            chat_control = (community.chat_control and community.is_chat_login) ? community.chat_control : false
            phone = community.phone.present? ? community.phone.scan(/\d/).join('') : ''
            phone = phone.present? ? ("Please check back later or call the property at: #{phone[-10..-8]}-#{phone[-7..-5]}-#{phone[-4..-1]}") : ''
            agent_status = chat_control ? "User is live" : "The agent has logged out. #{phone}"
        rescue => exception
            chat_control = true
            agent_status = "User is live"
        end
        
        chats = Chat.where("name = ? AND chatroom_id = ? AND id > ?", "Support Team", params[:chatroom_id], params[:last_msg_id]).order(created_at: :desc)
        if chats.present?
            message_history = serailize_messages(chats)
            render json: {messages: message_history,chatroom_id: params[:chatroom_id], chat_control: chat_control, agent_status: agent_status, stats: :OK, code: 200 }
        else
            render json: {messages: [],chatroom_id: params[:chatroom_id], chat_control: chat_control, agent_status: agent_status, stats: :OK, code: 200}
        end
    end

    def reset_unread_messages
        # set all messages of incoming chatroom by all support team users to zero
        chatroom = Chatroom.find params[:chatroom_id]
        all_community_members = chatroom.tour.community.users
        all_community_members.each do |user|
            unread_messages = Chat.where("chatroom_id = ? AND  name != ? ",  chatroom.id, "Support Team").unread_by(user)
            unread_messages.each do  |msg|
                msg.mark_as_read! for: user
            end
        end
        render json: {messages: "marked all as read"}
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
            user_obj[:_id] = 0  # support team id, no need of it
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
                user_obj[:_id] = 0  # support team id
                user_obj[:name] = msg.name
                user_obj[:avatar] = community.logo.present? ? community.logo.url : "/assets/logo-small.png"
            
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

    private

    def chat_params
        params.require(:chat).permit(:message, :name, :chatroom_id, :client_date)
    end

    def set_tour_user
        @tour_user = (Chatroom.find_by_id chat_params[:chatroom_id]).tour_user rescue TourUser.find_by(id: params[:tour_user_id])
    end
end

json.chats @chats do |chat|
    json.(chat, :id, :name, :message, :chatroom_id, :client_date)
    json.tour_user do 
        tour_user = chat.chatroom.tour_user
        json.name tour_user.name
        json.email tour_user.email
        json.image tour_user.image.present? ? tour_user.image.url : "/assets/chat-tour-user.jpg"
    end
end
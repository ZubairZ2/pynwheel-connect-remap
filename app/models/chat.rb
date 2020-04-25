class Chat < ApplicationRecord
    belongs_to :chatroom
  
    after_create :notify_pusher

    def notify_pusher
      data = self.attributes
      tour_user = self.chatroom.tour_user
      unless data[:name] == "Support Team"
        data[:tour_user] = {}
        data[:tour_user][:name] = tour_user.name
        data[:tour_user][:email] = tour_user.email
        data[:tour_user][:image] = tour_user.image.present? ? tour_user.image.url : "/assets/chat-tour-user.jpg"
      end 
        
      Pusher.trigger('chat', 'new-chat', data.as_json)
    end
end

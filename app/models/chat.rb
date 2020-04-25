class Chat < ApplicationRecord
    belongs_to :chatroom
  
    after_create :notify_pusher

    def notify_pusher
      data = self.attributes
      unless data[:name] == "Support Team"
        data[:tour_user] = {}
        data[:tour_user][:name] = self.chatroom.tour_user.name
        data[:tour_user][:email] = self.chatroom.tour_user.email
      end 
      
      Pusher.trigger('chat', 'new-chat', data.as_json)
    end
end

class Chat < ApplicationRecord
    belongs_to :chatroom
  
    # after_create :notify_pusher

    # def notify_pusher
    #   Pusher.trigger('chat', 'new-chat', self.as_json)
    # end
end

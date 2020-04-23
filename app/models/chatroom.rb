class Chatroom < ApplicationRecord
  belongs_to :tour_user
  belongs_to :tour
  has_many :chats

  # after_create :notify_pusher

  # def notify_pusher
  #     tour_user = self.tour_user
  #     data = {}
  #     data[:id] = tour_user.id
  #     data[:name] = tour_user.name
  #     data[:email] = tour_user.email
  #     data[:created_at] = tour_user.created_at     # although we will use client side time
  #     #  tour_user.image.url
  #     #  Any tour data and its community needed
  #     puts data

  #     puts "PUSHER_APP_ID     "   +    ENV["PUSHER_APP_ID"]
  #     puts "PUSHER_KEY        "   +    ENV["PUSHER_KEY"]
  #     puts "PUSHER_SECRET     "   +    Pusher.secret
  #     puts "PUSHER_CLUSTER    "   +    ENV["PUSHER_CLUSTER"]


  #     Pusher.trigger('chat', 'new-chatroom', data.as_json)
  # end

end

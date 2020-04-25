class Chatroom < ApplicationRecord
  belongs_to :tour_user
  belongs_to :tour
  has_many :chats

  after_create :notify_pusher

  def notify_pusher
      tour_user = self.tour_user

      data = {}
      data[:id] = self.id
      data[:created_at] = self.created_at     # although we will use client side time

      data[:tour_user] = {}
      data[:tour_user][:name] = tour_user.name
      data[:tour_user][:email] = tour_user.email
      data[:tour_user][:image] = tour_user.image.present? ? tour_user.image.url : "/assets/chat-tour-user.jpg"
      
      #  tour_user.image.url
      #  Any tour data and its community needed

      Pusher.trigger('chat', 'new-chatroom', data.as_json)
  end

end

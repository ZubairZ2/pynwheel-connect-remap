class Chatroom < ApplicationRecord
  belongs_to :tour_user
  belongs_to :tour
  has_many :chats, dependent: :destroy

  after_create :notify_pusher

  def notify_pusher
      tour_user = self.tour_user

      data = {}
      data[:id] = self.id
      data[:created_at] = self.created_at

      data[:tour_user] = {}
      data[:tour_user][:name] = tour_user.name
      data[:tour_user][:email] = tour_user.email
      data[:tour_user][:image] = tour_user.image.present? ? tour_user.image.url : "/assets/chat-tour-user.jpg"
      
      community = self.tour.community
      channel_name = (community.name.gsub(/[^0-9a-z ]/i, '') + "_with_id_" + community.id.to_s).gsub(' ', '_')
      
      Pusher.trigger(channel_name, 'new-chatroom', data.as_json)
  end

end

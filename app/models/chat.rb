class Chat < ApplicationRecord
    acts_as_readable on: :created_at
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
      
      community = self.chatroom.tour.community
      channel_name = community.name.tr(" ", "_") + "_with_id_" + community.id.to_s

      data[:unread_count] = send_notification

      Pusher.trigger(channel_name, 'new-chat', data.as_json)
    end

    def send_notification 
      all_community_members = self.chatroom.tour.community.users
      min_count = 99999
      all_community_members.each do |user|
        count = Chat.where("chatroom_id = ? AND  name != ? ", self.chatroom_id, "Support Team").unread_by(user).count
        if count < min_count
          min_count = count 
        end
      end
      if all_community_members.count == 0
        min_count=0
      end 
      return min_count
    end
end

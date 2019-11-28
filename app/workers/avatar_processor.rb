class AvatarProcessor
  @queue = :avatar_processor_queue

  def self.perform(user_id, avatar_key)
    user = HomePageVideo.find(user_id)
    user.key = avatar_key
    puts "99999999999999999999999999",user.avatar.direct_fog_url(:with_path => true)
    user.remote_avatar_url = user.avatar.direct_fog_url(:with_path => true)
    user.save!
  end
end
class ChatChannel < ApplicationCable::Channel
  def subscribed
    stream_from "chat_#{params[:support]}"
  end

  def unsubscribed
    # Any cleanup needed when channel is unsubscribed
  end

  def speak
    # Any cleanup needed when channel is unsubscribed
  end
end

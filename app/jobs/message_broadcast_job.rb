class MessageBroadcastJob < ApplicationJob
  # queue_as :default
  include SuckerPunch::Job

  def perform(message)
    ActionCable.server.broadcast "chat", {message: render_message(message)}
  end

  private

  def render_message(message)
    ApplicationController.renderer.render(partial: 'message', locals: {message: message})
  end
end

class MessagesController < ApplicationController
    skip_before_action :authenticate_user!
  
    # POST /message
    # POST /message.json
    def create
        message = Message.create(text: params[:message])
        # ActionCable.server.broadcast "chat", {message: render_message(message)}

        # respond_to do |format|
        #     if @message.save
        #         format.html { redirect_to @message, notice: 'message sent' }
        #         format.json { render :show, status: :created, message: @message }
        #     else
        #         format.html { render :new }
        #         format.json { render json: @message.errors, status: :unprocessable_entity }
        #     end
        # end
    end

    # def render_message(message)
    #     MessagesController.render(partial: 'message', locals: {message: message})
    # end
end

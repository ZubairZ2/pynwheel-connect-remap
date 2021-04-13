module Error
  module ErrorHandler
    def self.included(clazz)

      clazz.class_eval do
        rescue_from ActiveRecord::RecordNotFound do |e|
          controller = clazz.to_s
          message = 'You have discovered the secret hiding place of the Pynwheel 404 Error Page Dog. His name is Bob. He says, “Hey.” If you need assistance please email support@pynwheel.com or call 303-640-3652 (option 2)'
          respond(:record_not_found, 404, e.to_s, message)
        end
        # rescue_from ActiveRecord::ActiveRecordError do |e|
        #   respond(e.error, 422, e.to_s,@controller)
        # end
        # rescue_from ActiveModel::ValidationError do |e|
        #   response(e.error, 422, e.to_s, @controller)
        # end
        # rescue_from CanCan::AccessDenied do
        #   respond(:forbidden, 401, "current user isn't authorized for that")
        # end
        rescue_from StandardError do |e|
          controller = clazz.to_s
          message = 'Sorry, a spider monkey got loose in the server room with a can of tangerine La Croix. We are cleaning it up. If you need assistance please email support@pynwheel.com or call 303-640-3652 (option 2)'
          respond(:standard_error, 500, e.to_s, controller, message)
        end
      end
    end

    private
    
    def respond(_error, _status, _description, _controller, _message)
      # json = {:status => _status, :message => _message , :controller => controller}
      # render json: json
      redirect_to error_logs_generate_path(error_log: { :status => _status , :message => _message , :error_location => _controller, :description => _description})
    end
  end
end
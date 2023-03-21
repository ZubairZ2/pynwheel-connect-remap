module Log
  class Impression < StandardError

    attr_reader :request, :response, :namespace, :impression, :requester, :exception

    VALID_REQUESTING_PARTIES = [ActionDispatch::Request, ActionDispatch::Response]

    def initialize(requester:, exception: nil)
      @requester = requester
      @exception = exception
      load_requesting_parties
      @impression = ::Impression.find_or_initialize_by(request_id: request.request_id)
    end

    def request_filler
      return if request.blank?

      impression.in_request = build_request_hash
      impression.name_space = namespace
      impression.save!
      # Shift this to worker
    end

    def response_filler
      return if response.blank?

      # shift this to worker
      impression.out_response = build_response_hash
      impression.name_space = namespace
      impression.save!
    end

    def exception_filler
      return if exception.blank?
      response_hash = build_response_hash.merge!({request_trace: exception.backtrace[0..10].join(',')}) if response.present?
      impression.out_response = response_hash
      impression.save!
    end

    def build_request_hash
      {
        request_id: request.uuid || request.request_id,
        request_method: request.method,
        request_params: request.params.inspect,
        requester_ip:  request.remote_ip,
        request_url:  request.original_url,
        originated_from: request.user_agent, 
        request_body: {}
      }
    end

    def build_response_hash
      #TODO ; we need to see how much long json we could store and implement size limit or bytesize limit on parse json 
      {
        request_id: request.uuid || request.request_id,
        request_method: request.method,
        request_params: request.params.inspect,
        requester_ip:  request.remote_ip,
        request_url:  request.original_url,
        originated_from: request.user_agent,
        request_body: response.body.present? ? JSON.parse(response.body) : response.body
      }
    end

    private

    def original_caller_location
      caller_location = caller_locations[1]
      return unless caller_location

      caller_class_name = caller_location.path.split('/')&.last&.split('.')&.first
      return unless caller_class_name

      "#{[caller_class_name, caller_location.base_label].join('.')}:#{caller_location.lineno}"
    end

    def load_requesting_parties
      if requester.is_a? ActionDispatch::Request
        @request = requester
        @namespace = requester.params.dig('controller')
      elsif requester.is_a? ActionDispatch::Response
        @response = requester
        @request = @response.request
        @namespace = request.params.dig('controller')
      else
        @request = @response = @namespace = nil
      end
    end
  end
end

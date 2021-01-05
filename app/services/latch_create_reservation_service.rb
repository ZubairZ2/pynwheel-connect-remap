class LatchCreateReservationService < BaseService
    def self.call(*args, &block)
        request_data = args[0]
        new(request_data[:community_id]).execute(
            request_data[:startTime] ,
            request_data[:endTime] ,
            request_data[:keyIds] ,
            request_data[:tour_user] ,
            request_data[:allowedKeycardCount])
    end

    def initialize(community_id)
        @latch_property = Latch.find_by(community_id: community_id)
    end

    def execute(startTime, endTime, keyIds, tour_user, allowedKeycardCount)
        if @latch_property.present?
            # proxy = URI("http://2rn1rzbnnvgtcd:6oH04iuecO3nRnroOcKhomXhHw@us-east-static-06.quotaguard.com:9293")
            proxy = URI(ENV["QUOTAGUARDSTATIC_URL"])
            options = 	{http_proxyaddr: proxy.host,http_proxyport:proxy.port, http_proxyuser:proxy.user, http_proxypass:proxy.password}

            request = {}
            request[:host] = "reservations.integrations.latch.com"
            request[:endpoint] = "/v1/reservations"
            request[:url]  = "https://" + request[:host] + request[:endpoint]
            request[:type]  = "POST"
            
            request[:body] = {
                startTime: startTime.to_i,
                endTime: endTime.to_i,
                keyIds: keyIds, # ["6f3a5dc6-2abf-4c66-a51e-2afd10d58514"], # keyIds
                firstName: tour_user.first_name.present? ? tour_user.first_name : tour_user.name,
                lastName: tour_user.last_name.present? ? tour_user.last_name : ' ',
                allowedKeycardCount: allowedKeycardCount
            }.to_json

            token = sign_token_for_latch_request(request, @latch_property.client_id, @latch_property.client_secret)

            # puts '>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>'
            # decode =  JWT.decode token, Base64.decode64(@latch_property.client_secret), true, { algorithm: 'HS256' }
            # puts decode
            # puts '<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<'

            response = HTTParty.post(request[:url],
                :http_proxyaddr => proxy.host,
                :http_proxyport => proxy.port, 
                :http_proxyuser => proxy.user, 
                :http_proxypass => proxy.password,
                :body => request[:body] ,
                :headers => { 'Authorization' => token, 'Content-Type' => 'application/json'})

            puts "---"*10
            puts response

            return response
        end
    end
end
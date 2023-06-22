module LatchOpenkit
  class LocksService < LatchOpenkit::BaseService

    def generate_doors_accesses
      binding.pry
      parner_scopped_access_token()
    end

    private

      def parner_scopped_access_token
        binding.pry
        response = HTTParty.post(openkit_auth_url,
                                  body: parner_scopped_access_token_payload.to_json,
                                  headers: { 'Content-Type' => 'application/json' }
                                )
                                binding.pry
      end

      def user_scopped_passwordless_start
        response = HTTParty.post(openkit_auth_url,
                                  body: user_scopped_passwordless_start_payload.to_json,
                                  headers: { 'Content-Type' => 'application/json' }
                                )
                                binding.pry
      end



      def user_scopped_passwordless_token
        response = HTTParty.post(openkit_auth_url,
                                  body: user_scopped_passwordless_token_payload.to_json,
                                  headers: { 'Content-Type' => 'application/json' }
                                )
                                binding.pry

      end
  end
end
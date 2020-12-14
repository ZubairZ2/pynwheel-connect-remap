module ZervServices
    class BaseService
        def self.call(*args, &block)
            request_data = args[0]
            new(request_data[:community]).execute(request_data[:test_connection])
        end

        def initialize(community)
            @zerv = community.zerv
        end

        def hard_coded_token
            "eyJraWQiOiJROVlLNjYxeE5tb1wvT1ljWnFhVFlCcVU1OWFUeTM2VG5ZSEtYZnBxU3Jycz0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiI5OTIwOGI0Ni0xMTA0LTQzMzUtYmRmMC1kNTcxNGFjZWIxZDkiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiaXNzIjoiaHR0cHM6XC9cL2NvZ25pdG8taWRwLnVzLWVhc3QtMS5hbWF6b25hd3MuY29tXC91cy1lYXN0LTFfSW8ya2F3RzRFIiwiY29nbml0bzp1c2VybmFtZSI6InB5bndoZWVsX2plbm5pZmVyX2N5cGhlcnMiLCJnaXZlbl9uYW1lIjoiSmVubmlmZXIiLCJhdWQiOiI1bmJzMjhwcTdqZWU3bWRqanNsNm01NnU5ZiIsImN1c3RvbTpjdXN0b21lcklkIjoiUHluV2hlZWwtaktPT2UiLCJldmVudF9pZCI6ImQ0OWYyNzdhLTYxNDctNDBmOC04ODU4LTUxZDliMjBiYjJkMiIsInRva2VuX3VzZSI6ImlkIiwiYXV0aF90aW1lIjoxNjA2NzQ1Mjg3LCJuYW1lIjoiSmVubmlmZXIgQ3lwaGVycyIsInBob25lX251bWJlciI6IisxMzAzOTkwMDgzNCIsImV4cCI6MTYwNjc0ODg4NywiY3VzdG9tOnJvbGUiOiJDbGllbnQtQWRtaW4iLCJpYXQiOjE2MDY3NDUyODcsImZhbWlseV9uYW1lIjoiQ3lwaGVycyIsImVtYWlsIjoiamVubmlmZXJAcHlud2hlZWwuY29tIn0.uYnkUCRTjuKZM08CQwhrza420n56N70jlHrM6mwWG0kauFO4gcyF32VmLHcvWciPy9R6AYqsLVDnN9qnGxaqKEwuLb9GqjSOUbqIB9tYKvvKSXmNKA5MmofUQDs6SX27TiEOEyEMfKYuqRCb38geMNsrDAo-QLWzBCcaZKutQFGM6MeM6mJ52JrnBA0Mf-phFw_Q_8TNCtpder3AbSGYC7OspkbSbRiteON6TSbcmbJnELzn-Zp19x4XKz5lydL-_29NFgYd4QD-fgo6PD4I3QwHjXCRlIkMVKMuEiX9-A9B_N0q_X1yJAk6wiG_bdkii34s2oe25l6P1fl78jZ5Uw"
        end
        
        def get_id_token
            token  = Rails.cache.fetch(:id_token, expires_in: 1.day.from_now) do
                result = generate_id_token
                result[:error].nil? ? result[:id_token] : nil
            end

            if token.nil? or token.blank?
                result = generate_id_token
                token = result[:error].nil? ? result[:id_token] : nil
            end
            
            return token 
            # token = "eyJraWQiOiJROVlLNjYxeE5tb1wvT1ljWnFhVFlCcVU1OWFUeTM2VG5ZSEtYZnBxU3Jycz0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiI5OTIwOGI0Ni0xMTA0LTQzMzUtYmRmMC1kNTcxNGFjZWIxZDkiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiaXNzIjoiaHR0cHM6XC9cL2NvZ25pdG8taWRwLnVzLWVhc3QtMS5hbWF6b25hd3MuY29tXC91cy1lYXN0LTFfSW8ya2F3RzRFIiwiY29nbml0bzp1c2VybmFtZSI6InB5bndoZWVsX2plbm5pZmVyX2N5cGhlcnMiLCJnaXZlbl9uYW1lIjoiSmVubmlmZXIiLCJhdWQiOiI1bmJzMjhwcTdqZWU3bWRqanNsNm01NnU5ZiIsImN1c3RvbTpjdXN0b21lcklkIjoiUHluV2hlZWwtaktPT2UiLCJldmVudF9pZCI6ImYwMzkwZmI0LTI0ZWMtNGUzNS05ODBjLWIzMjAwOTNhYWFmNiIsInRva2VuX3VzZSI6ImlkIiwiYXV0aF90aW1lIjoxNjA3Nzc4OTkzLCJuYW1lIjoiSmVubmlmZXIgQ3lwaGVycyIsInBob25lX251bWJlciI6IisxMzAzOTkwMDgzNCIsImV4cCI6MTYwNzc4MjU5MywiY3VzdG9tOnJvbGUiOiJDbGllbnQtQWRtaW4iLCJpYXQiOjE2MDc3Nzg5OTMsImZhbWlseV9uYW1lIjoiQ3lwaGVycyIsImVtYWlsIjoiamVubmlmZXJAcHlud2hlZWwuY29tIn0.FWJteDajbfQdqM1642VmLORAKvimzjKd8GHUx5jT2HUCvqaXugOgPBZMYYxx_XZ9Hv2Xn6Fyf4j6veUgcSk8PAKCnn2siqbDzFD7rrMealgTkOOI0Sd1NhU-_kLApVo-KG5PZ0VFU7ozAf8EgWjwe2mmHnXIqD7JZKl41sxZapH7hI8kSEYoGiJ4nKqM4M2ru5JLUUnUDM8JxYKJ3ELc6xAwPkKbJ3xshgm2wUhDUU9lDGmSRkKgW_TNvyLAhyLsgrGKsES6p_dqhgwAEwJtIJpNVvnPUBs_NgR3dilbCc0_Qhah-Wf859b2k4YTIFkkFKcSRVxdEbdaiiYE37152A"
            
        end

        def generate_id_token

            result = ZervServices::LoginService.call(community: @zerv.community)

            if result.success?
                if result.payload["code"] == "200" and result.payload["status"] == "success"
                    {id_token:  result.payload["idToken"], error: nil}
                else
                    {id_token:  nil, error: "api executed with status: #{result.payload["status"]}"}
                end
            else
                {id_token:  nil, error: result.error}
            end

        end
    end
end
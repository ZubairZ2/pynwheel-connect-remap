module SalesforceServices
    class GetBookingByNeighbor < SalesforceServices::BaseService

        def execute(args)
            tour_user = args[:tour_user]
            url = base_url + "/getBookingsByNeighbor"
            token = get_access_token
            if token.success?
                auth_header = "Bearer " + token.payload["access_token"]

                begin
                    response = HTTParty.post(url,
                        body: {
                            "searchString": tour_user.email
                        }.to_json,
                        :headers => { 'Authorization' => auth_header,
                                    'Content-Type' => 'application/json' }
                    )
                rescue HTTParty::Error => e
                    OpenStruct.new({success?: false, error: e, payload: nil})
                else
                    if response.code == "200" or response.code == 200
                        OpenStruct.new({success?: true, error: nil, payload: response})
                    else
                        OpenStruct.new({success?: false, error: response, payload: nil})
                    end
                end

            else
                token # its already a OpenStruct
            end
        end

    end
end
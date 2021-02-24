module SalesforceServices
    class AuthToken < SalesforceServices::BaseService

        def execute(args)
            url = "https://prometheusreg.my.salesforce.com/services/oauth2/token"
            response = HTTParty.post(url,
                body: {
                    username: @sales_force.salesforce_username,
                    password: @sales_force.salesforce_password,
                    client_id: @sales_force.salesforce_client_id,
                    client_secret: @sales_force.salesforce_secret_id,
                    grant_type: "password"
                }
            )

        rescue HTTParty::Error => e
            OpenStruct.new({success?: false, error: e, payload: nil})
        else
            unless response["error"].present?
                OpenStruct.new({success?: true, error: nil, payload: response})
            else
                OpenStruct.new({success?: false, error: response["error"], payload: nil})
            end
        end

    end
end
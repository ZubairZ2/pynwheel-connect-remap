module SalesforceServices
    class AuthToken < SalesforceServices::BaseService

        def execute(args)
            url = "https://prometheusreg--promuat.my.salesforce.com/services/oauth2/token"
            response = HTTParty.post(url,
                body: {
                    username: @sales_force.crm_username,
                    password: @sales_force.crm_password,
                    client_id: @sales_force.crm_client_id,
                    client_secret: @sales_force.crm_client_secret,
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
class RemoteLocksController < ApplicationController
    require 'oauth2'   
    before_action :set_user, only: [:client_credentials, :get_deivces, :create_access_guest, :grant_access, :authorization_code]
    before_action :set_base_url, only: [:client_credentials, :get_deivces, :create_access_guest, :grant_access, :authorization_code ]
    skip_before_action :authenticate_user!

    def new
        @edge_state = EdgeState.new  
    end

    def save_edgestate_credentails
        @edge_state = EdgeState.new(edge_state_params)
        if @edge_state.save
            flash[:notice] = "Records saved successfully"
            redirect_to companies_path
        else
            flash[:error] = @edge_state.errors.full_messages.join(',')
            render :new
        end
    end

    def client_credentials
        if @edge_state_user.present?
            base_url = "https://connect.remotelock.com/oauth/token"

            response = HTTParty.post(base_url,
                body: {
                    client_id: @edge_state_user.client_id,
                    client_secret: @edge_state_user.client_secret,
                    grant_type: "client_credentials"
                },
                headers: { 'Content-Type' => 'application/x-www-form-urlencoded' } )

            render json: response

            # site_path = "https://connect.remotelock.com"
            # redirect_uri = 'urn:ietf:wg:oauth:2.0:oob'

            # client = OAuth2::Client.new(
            #     @edge_state_user.client_id,
            #     @edge_state_user.client_secret,
            #     :site   => site_path
            # )

            # auth_url = client.auth_code.authorize_url(:redirect_uri => redirect_uri)
            # token = client.client_credentials.get_token

        end
    end

    def get_deivces
        if @edge_state_user.present?
            access_token = request.headers['Authorization']
            token_type = "Bearer"
            auth_header = token_type + " " + access_token

            url = @base_url + "/devices"

            response = HTTParty.get(url,
                :headers => { 'Authorization' => auth_header,
                                'Accept' => 'application/vnd.lockstate+json; version=1' } )

            # puts response["data"] # devices_list
            render json: response
        end
    end

    def create_access_guest
        if @edge_state_user.present?
            access_token = request.headers['Authorization']
            token_type = "Bearer"
            auth_header = token_type + " " + access_token

            url = @base_url + "/access_persons"

            response = HTTParty.post(url,
                body: {
                    type: "access_guest",
                    attributes: {
                        name: "Ali",
                        email: "ali@gmail.com",
                        department: "development",
                        phone: "+92987654321",
                        starts_at: "2020-01-02T16:04:00",
                        ends_at: "2021-01-02T16:04:00",
                        generate_pin: true
                    }
                }.to_json,
                :headers => { 'Authorization' => auth_header,
                                'Accept' => 'application/vnd.lockstate+json; version=1',
                                'Content-Type' => 'application/json' } )
            # puts response
            render json: response
        end
    end

    def grant_access
        access_token = request.headers['Authorization']
        token_type = "Bearer"
        auth_header = token_type + " " + access_token

        url = @base_url + "/access_persons"

        response = HTTParty.post(url,
            body: {
                type: "access_user",
                attributes: {
                "accessible_id": "053994ef-ceed-455a-a5f7-7962261a722d",
                "accessible_type": "lock"
                }
            }.to_json,
            :headers => { 'Authorization' => auth_header,
                            'Accept' => 'application/vnd.lockstate+json; version=1',
                            'Content-Type' => 'application/json' } )
        # puts response
        render json: response

    end
    
    private
        def edge_state_params
            params.require(:edgestate).permit(:client_id, :client_secret, :user_id)
        end
        
        def set_user
            @edge_state_user = EdgeState.find_by(community_id: params[:community_id], user_id: params[:user_id])
        end

        def set_base_url
            @base_url = "https://api.remotelock.com"
        end
end
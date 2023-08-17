class GoogleNeighbourhoodService
  def initialize(params)
    @params = params
    @community = find_community
    @results = []
    @request_counter = 0
  end

  def call
    return unauthorized_response unless valid_token?
    return render_response(success: false, message: 'Community not found') if @community.nil?

    process_neighbourhood_request
    @community.save

    render_response(success: true, counter: @community.neighborhood_request_counter, message: @results.empty? ? 'No results found' : @results)
  end

  private

  def valid_token?
    @params[:token] == ENV['NEIGHBOURHOOD_API_TOKEN']
  end

  def find_community
    community_id = (@params[:id].to_i == 1) ? 748 : @params[:id]
    Community.find_by(id: community_id)
  end

  def process_neighbourhood_request
    @community.neighborhood_request_counter += 1

    if @community.neighborhood_request_counter < @community.neighborhood_request_counter_limit
      process_email_notification(200, 'Testing api calls 200', 'email_counter_200') if (20..21).cover?(@community.neighborhood_request_counter)
      process_email_notification(400, 'Testing api calls 400', 'email_counter_400') if (40..41).cover?(@community.neighborhood_request_counter)
      fetch_neighbourhood_data
    else
      render_response(success: true, counter: @community.neighborhood_request_counter, message: 'Limit Exceeded')
    end
  end

  def process_email_notification(threshold, subject, mailer_method)
    unless @community.public_send("limit_#{threshold}_hit")
      @community.public_send("neighbourhood_counter_mail_#{threshold}")
      @community.public_send("limit_#{threshold}_hit=", true)
      NeighbourhoodMailer.public_send(mailer_method, ENV['PYNWHEEL_DEV_EMAIL'], ENV['PYNWHEEL_DEV_EMAIL'], '', subject).deliver
    end
  rescue StandardError
    nil
  end

  def fetch_neighbourhood_data
    # Rank By Distance API URL
    # url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?types=#{@params[:cat]}&location=#{@params[:latitude]},#{@params[:longitude]}&rankby=distance&key=#{ENV['GOOGLE_MAPS_API_KEY']}"
    
    # Radius based API URL 
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?types=#{@params[:cat]}&location=#{@params[:latitude]},#{@params[:longitude]}&radius=#{@params[:radius]}&key=#{ENV['GOOGLE_MAPS_API_KEY']}"
    
    fetch_recursive(url, 1)
    @results

  rescue StandardError
    nil
  end
  
  def fetch_recursive(url, remaining_iterations)
    response = HTTParty.get(url)

    if response['status'] == 'OK'
      @results << response
      if response['next_page_token'].present? && remaining_iterations > 0
        sleep(2)  # Wait before the next request to avoid rate limiting
        next_url = "#{url}&pagetoken=#{response['next_page_token']}"
        fetch_recursive(next_url, remaining_iterations - 1 )
      end
    end
  end

  def render_response(response_hash)
    { json: response_hash, status: 200 }
  end

  def unauthorized_response
    render_response(success: false, message: 'You are not allowed to make this call.')
  end
end

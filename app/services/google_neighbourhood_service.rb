class GoogleNeighbourhoodService
  def initialize(params)
    @params = params
    @community = find_community
    @results = []
    @request_counter = 0
    @next_page_token = ""
  end

  def call
    return unauthorized_response unless valid_token?
    return render_response(success: false, message: 'Community not found') if @community.nil?

    process_neighbourhood_request
    @community.save

    render_response(success: true, counter: @community.neighborhood_request_counter, message: get_formatted_response())
  end

  private

  def get_formatted_response
    !@results.empty? ? [{
      html_attributions: [],
      next_page_token: @next_page_token,
      results: @results.flatten!, 
      status: "OK"
    }] : 'No results found'
  end

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
    categories_list = categories() # Get the list of categories based on input
    @results = [] # Initialize results array
  
    if categories_list.length == 1
      # If only one category, fetch up to 40 records for that category
      fetch_single_category_data(categories_list.first)
    else
      # If multiple categories, mix records and fetch up to 40 mixed records
      fetch_mixed_category_data(categories_list)
    end
  
    @results
  rescue StandardError
    nil
  end
  
  def fetch_single_category_data(category)
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?types=#{category}&location=#{@params[:latitude]},#{@params[:longitude]}&rankby=distance&key=#{ENV['GOOGLE_MAPS_API_KEY']}"
    fetch_recursive(url, 1)
  end
  
  def fetch_mixed_category_data(categories_list)
    mixed_results = [] # Initialize mixed results array
  
    categories_list.each do |category|
      url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?types=#{category}&location=#{@params[:latitude]},#{@params[:longitude]}&rankby=distance&key=#{ENV['GOOGLE_MAPS_API_KEY']}"
      response = HTTParty.get(url)
  
      if response['status'] == 'OK'
        mixed_results.concat(response['results']) # Mix results from different categories
      end
    end
  
    mixed_results.shuffle! # Shuffle the mixed results
    mixed_results = mixed_results.take(40) # Fetch up to 40 mixed records
  
    @results << mixed_results
  end
  

  def categories
    case @params[:cat]
    when 'restaurant', 'restaurants'
      ['restaurant']
    when 'shopping'
      ['shopping_mall', 'shoe_store', 'department_store', 'electronics_store', 'clothing_store', 'home_goods_store', 'furniture_store', 'pet_store', 'book_store', 'jewelry_store']
    when 'entertainment'
      ['movie_theater', 'bowling_alley', 'amusement_park', 'zoo', 'stadium', 'gym', 'library', 'aquarium', 'art_gallery']
    when 'school', 'schools'
      ['school']
    when 'bank', 'banks'
      ['bank', 'atm']
    when 'park', 'parks'
      ['park']
    when 'errand', 'errands'
      ['car_repair', 'car_wash', 'gas_station', 'hair_care', 'hardware_store', 'veterinary_care', 'post_office', 'pharmacy', 'grocery', 'supermarket', 'convenience_store']
    else
      @params[:cat]
    end
  end

  def fetch_recursive(url, remaining_iterations)
    response = HTTParty.get(url)

    if response['status'] == 'OK'
      @results << response["results"]
      if response['next_page_token'].present? && remaining_iterations > 0
        @next_page_token = response['next_page_token']
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

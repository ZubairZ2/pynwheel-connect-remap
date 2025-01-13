class PropertyAccessCode
  def initialize(community, tour_user, tour_type)
    @community = community
    @tour_user = tour_user
    @tour_type = tour_type
    @tour_length_stay_limit = @community&.community_tour&.tour_setting&.length_stay_limit
  end

  def restrict_property_access_with_code

    if @tour_type != "virtual_tour" && @tour_user.check_code_expiry(@community)
      @tour_user.update(property_access_code: generate_six_digit_random_pin, property_access_code_generated_at: Time.now, restricted_property_access: true)
      # create_tour_history()
      property_access_code_content()
    end

  end

  private

  def property_access_code_content
    subject = "Property Access Code for #{@tour_user&.name&.titleize}"
    body = "#{@tour_user&.name&.titleize} is ready to start a Pynwheel Tour at #{@community.name}. 
    Please instruct #{@tour_user.first_name.titleize} to enter this property access code into the Pynwheel Tour app:<br>
    <br>#{@tour_user.property_access_code}<br>
    <br>This code will expire in #{@tour_length_stay_limit} minutes<br> 
    <br>Thanks!"

    send_access_code_email(subject, body)
  end

  def generate_six_digit_random_pin
    (SecureRandom.random_number * (10**6)).round.to_s
  end

  def create_tour_history
    tour_history = TourHistory.find_or_create_by(tour_user_id: @tour_user.id) rescue TourHistory.new
    tour_history.update(community_id: @community.id, tour_type: @tour_type, tour_user_id: @tour_user.id, tour_id: @community.community_tour.id)
    last_arrival = @tour_user.tour_histories.where(tour_id: @community.community_tour.id).last rescue nil
    last_arrival.update(arrived: Time.now) if last_arrival.present?
  end

  def send_access_code_email subj, body
    return if @community.blank?

    emails = @community.email.gsub(" ","").split(',')

    emails.each do |email|
      NotificationMailer.tour_history_mail(subj, body, email, INFO_EMAIL, @community, false, nil).deliver
    end

  end

end
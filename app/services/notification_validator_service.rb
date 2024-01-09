class NotificationValidatorService
  
  def initialize(email, community_id)
    @community = Community.find_by_id(community_id)
    @email = email
  end

  def validate_recipient
    return true if (@community.nil? || !is_test_property?)

    valid_email_domain?
  rescue => error
    false
  end

  private

    def valid_email_domain?
      Mail::Address.new(@email)&.domain&.downcase == ENV["TESTING_EMAIL_DOMAIN"]
    rescue Mail::Field::ParseError
      false
    end

    def is_test_property?
      Community.test_properties.ids.include?(@community.id)
    end
end

class NotificationValidatorService
  def initialize(email, community)
    @community = community
    @email = email
  end

  def validate_recipient
    return true unless is_test_property?
    valid_email_domain?
  end

  private

    def valid_email_domain?
      parsed_email = Mail::Address.new(@email)
      domain = parsed_email.domain.downcase
      domain == 'pynwheel.com'
    rescue Mail::Field::ParseError
      false
    end

    def is_test_property?
      Community.test_properties.include?(@community)
    end
end
class NotificationValidatorService
  def initialize(community_id, email)
    @community = Community.find_by_id(community_id)
    @email = email
  end

  def validate_recipient
    return false unless valid_inputs?
    return true unless is_test_property?

    valid_email_domain?
  rescue => error
    false
  end

  private

    def valid_inputs?
      @community.present? && @email.present?
    end

    def valid_email_domain?
      domain = Mail::Address.new(@email).domain.downcase
      domain == 'pynwheel.com'
    rescue Mail::Field::ParseError
      false
    end

    def is_test_property?
      Community.test_properties.ids.include?(@community.id)
    end
end

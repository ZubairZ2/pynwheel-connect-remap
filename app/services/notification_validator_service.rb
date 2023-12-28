class NotificationValidatorService
  def initialize(community_id, email)
    @community = set_community(community_id)
    @email = email || @community&.email

    return false unless (@community.present? && @email.present?)
  end

  def validate_recipient
    return true unless is_test_property?
    valid_email_domain?
  end

  private

    def set_community
      Community.find_by_id community_id
    end

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
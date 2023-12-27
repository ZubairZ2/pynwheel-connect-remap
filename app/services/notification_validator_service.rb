class NotificationValidatorService
  def initialize(email, community)
    @community = community
    @email = email
  end

  def validate_recipient
      if is_test_property?
        if valid_email_domain?
          true
        else
          false
        end
      else
        true
      end
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
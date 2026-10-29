# frozen_string_literal: true

module PropertyClone
  # Bootstraps the test administrator of a cloned company through the
  # existing Devise/role model: a "Company admin" of the clone company with
  # Pynwheel Connect access and an assignment to the cloned property. That
  # role's reach is the company's own properties (User#can_access_community?,
  # AccessibleCommunitiesQuery, Ability), so it can operate the clone and
  # nothing else.
  #
  # An existing account with the same e-mail is never touched (status
  # :exists). Outside production a password may be supplied (TEST_ADMIN_PASSWORD).
  # On a production-like database no password is accepted: the account gets a
  # random, unknown password and a one-time Devise reset link, written to a
  # 0600 file for the operator; the administrator sets their own password
  # through the normal "forgot password" page. The password is never logged.
  class TestAdmin
    Result = Struct.new(:status, :user_id, :email, :role, :company_id, :community_id, :credential_file, :message, keyword_init: true)

    def self.call!(company:, community:, email:, password: nil, production: EnvironmentGuard.production_like?, host: ENV['HOST_URL'].presence || 'http://localhost:3000')
      new(company: company, community: community, email: email, password: password, production: production, host: host).call!
    end

    def initialize(company:, community:, email:, password:, production:, host:)
      @company = company
      @community = community
      @email = email.to_s.strip.downcase
      @password = password.presence
      @production = production
      @host = host
    end

    def call!
      raise Error, 'the property does not belong to the company' unless @community.company_id == @company.id
      raise Error, 'invalid e-mail' unless @email.match?(Devise.email_regexp)

      existing = User.find_by('lower(email) = ?', @email)
      if existing
        return Result.new(status: :exists, user_id: existing.id, email: @email, role: existing.role, company_id: existing.company_id,
                          message: "an account with this e-mail already exists (user #{existing.id}, role #{existing.role.inspect}, company #{existing.company_id.inspect}); it was not modified")
      end
      raise Blocked, 'a chosen password is not accepted on a production-like database; omit it and use the reset link' if @production && @password

      generated = @password.nil?
      secret = @password || SecureRandom.base58(32)
      user = User.new(email: @email, first_name: 'Script', last_name: 'Tester', role: 'Company admin', company_id: @company.id,
                      pynwheel_connect_access: true, pynwheel_launch_access: false)
      user.password = secret
      user.password_confirmation = secret
      credential_file = nil
      ActiveRecord::Base.transaction do
        user.save!
        CommunityUser.create!(community_id: @community.id, user_id: user.id, enable_community_id: @community.id, chat_enable: false)
        credential_file = write_reset_link(user) if generated
      end
      Result.new(status: :created, user_id: user.id, email: @email, role: user.role, company_id: @company.id, community_id: @community.id,
                 credential_file: credential_file&.to_s,
                 message: generated ? 'created with a random password; the one-time reset link is in the credential file' : 'created with the supplied password (non-production only)')
    end

    private

      def write_reset_link(user)
        raw, enc = Devise.token_generator.generate(User, :reset_password_token)
        user.update_columns(reset_password_token: enc, reset_password_sent_at: Time.current)
        path = Manifest.dir.join("test-admin-#{user.id}-#{Time.current.strftime('%Y%m%dT%H%M%S')}.txt")
        File.open(path, 'w', 0o600) do |f|
          f.puts "Test administrator #{@email} (user #{user.id}) for company #{@company.id} / property #{@community.id}"
          f.puts 'Set the password through this one-time link (Devise reset flow), then delete this file:'
          f.puts "#{@host}/users/password/edit?reset_password_token=#{raw}"
        end
        File.chmod(0o600, path)
        path
      end
  end
end

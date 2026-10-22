# frozen_string_literal: true

module TourApi
  # Sign in, sign out and the bearer check of the Tour App API, over two
  # kinds of principal:
  #
  # * **Staff**: the CMS's own accounts and Doorkeeper tokens. Sign-in is the
  #   CMS's Doorkeeper password grant run in-process (the controller is the
  #   Doorkeeper context, so `resource_owner_from_credentials` - Devise's
  #   `find_for_database_authentication` + `valid_password?` - verifies the
  #   password exactly as `POST /api/v2/auth/token` does; no password rule is
  #   re-implemented here). The token the app receives is the CMS's
  #   `oauth_access_tokens` row; every request looks it up (`by_token`), so
  #   revocation and expiry are the CMS's. Only Super Admins are admitted; a
  #   refused account's freshly minted token is revoked at once.
  # * **Visitor** (October 23, 2026): a prospect who proved a phone number
  #   with a one-time code (Visitors::Otp) and holds a `vst_…` session token
  #   (Visitors::Session). A visitor is never a CMS user: the context has no
  #   `user`, and nothing a visitor can reach treats them as staff.
  #
  # Nothing here logs a password or a token.
  module Auth
    SUPER_ADMIN_ROLE = 'Super admin'

    # The signed-in CMS Super Admin.
    Context = Struct.new(:token, :user, keyword_init: true) do
      def role
        'super_admin'
      end

      def staff?
        true
      end

      def visitor?
        false
      end

      def visitor
        nil
      end

      def whodunnit
        user.id.to_s
      end

      def expires_at
        token.expires_at
      end

      def user_json
        { id: user.id, name: Auth.display_name(user), email: user.email, role: role }
      end
    end

    # The signed-in visitor (a `tour_users` row) and its session row.
    VisitorContext = Struct.new(:session, :visitor, keyword_init: true) do
      def role
        'visitor'
      end

      def staff?
        false
      end

      def visitor?
        true
      end

      def user
        nil
      end

      def whodunnit
        "visitor:#{visitor.id}"
      end

      def expires_at
        session.expires_at
      end

      def visitor_json
        Auth.visitor_json(visitor)
      end
    end

    module_function

    # `granted` is what `Doorkeeper::Server#token_request('password').authorize`
    # answered: a TokenResponse (the credentials were right) or an ErrorResponse.
    def login(granted)
      unless granted.is_a?(Doorkeeper::OAuth::TokenResponse) && granted.token
        raise ApiError.new(401, 'invalid_credentials', 'That email and password do not match.')
      end

      token = granted.token
      begin
        user = token.resource_owner_id && User.find_by(id: token.resource_owner_id)
        # The CMS's own token endpoint withholds the token from accounts that are
        # not portal users (`CustomTokenResponse`); the same accounts are refused here.
        if user && !user.verified_portal_user?
          raise ApiError.forbidden('not_authorized_account', 'This account is not allowed to use the Tour App.')
        end

        admit(token)
      rescue ApiError
        token.revoke unless token.revoked?
        Rails.logger.warn("[tour-api] login refused user_id=#{token.resource_owner_id.inspect}")
        raise
      end
    end

    # The principal a bearer proves: a visitor for a `vst_` token (when the
    # visitor sign-in is switched on), else a staff Doorkeeper token.
    def authenticate(bearer)
      raise ApiError.unauthorized if bearer.blank?

      if Visitors::Session.visitor_token?(bearer)
        raise ApiError.unauthorized('invalid_token', 'That session is not valid. Please sign in again.') unless Connect::Flags.tour_visitor_auth_enabled?

        session = Visitors::Session.authenticate(bearer)
        visitor = TourUser.find_by(id: session.tour_user_id)
        raise ApiError.unauthorized('invalid_token', 'That session is not valid. Please sign in again.') if visitor.nil? || visitor.phone_number == Visitors::Privacy::REMOVED

        return VisitorContext.new(session: session, visitor: visitor)
      end

      token = Doorkeeper::AccessToken.by_token(bearer)
      raise ApiError.unauthorized('invalid_token', 'That session is not valid. Please sign in again.') if token.nil?

      admit(token)
    end

    # true when the token is now revoked (the app drops it either way).
    def logout(context)
      if context.visitor?
        context.session.revoke!
        return context.session.revoked_at.present?
      end

      context.token.revoke unless context.token.revoked?
      context.token.revoked?
    end

    def admit(token)
      raise ApiError.unauthorized('token_revoked', 'You have been signed out. Please sign in again.') if token.revoked?
      raise ApiError.unauthorized('token_expired', 'Your session has expired. Please sign in again.') if token.expired?

      user = token.resource_owner_id && User.find_by(id: token.resource_owner_id)
      raise ApiError.unauthorized('invalid_token', 'That session is not valid. Please sign in again.') if user.nil?
      raise ApiError.forbidden('inactive_user', 'This account is not active.') if inactive?(user)
      raise ApiError.forbidden('not_super_admin', 'Only Pynwheel Super Admins can use the Tour App.') unless user.is_super_admin?

      Context.new(token: token, user: user)
    end

    # There is no per-user "active" column: inactive is a pending invitation
    # (never accepted) or an inactivated company.
    def inactive?(user)
      (user.invitation_token.present? && user.invitation_accepted_at.nil?) || user.company&.inactivate == true
    end

    # `User#name` without its nil-safety gap: the email when both names are missing, else "First Last".
    def display_name(user)
      return user.email.to_s if user.first_name.nil? && user.last_name.nil?

      "#{user.first_name} #{user.last_name}".strip
    end

    # What the app may keep of a visitor: no verification images, no codes.
    def visitor_json(visitor)
      {
        id: visitor.id,
        first_name: visitor.first_name,
        last_name: visitor.last_name,
        name: visitor.name.presence || "#{visitor.first_name} #{visitor.last_name}".strip,
        email: visitor.email,
        phone_number: visitor.phone_number,
        phone_masked: mask_phone(visitor.phone_number),
        is_sms_enabled: visitor.is_sms_enabled != false,
        role: 'visitor'
      }
    end

    def mask_phone(phone)
      digits = phone.to_s
      return nil if digits.blank?

      digits.length > 4 ? "#{'•' * [digits.length - 4, 3].min}#{digits[-4..]}" : digits
    end
  end
end

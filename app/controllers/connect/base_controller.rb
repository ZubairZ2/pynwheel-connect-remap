# frozen_string_literal: true

module Connect
  # The base of the Pynwheel Connect Tour Setup endpoints (Locks, Stops,
  # Visitors, Booking): JSON only, on their own routes
  # (`/communities/:community_id/connect/*`), so no legacy action changes.
  # A subclass names its read actions in CONNECT_READ_ACTIONS (ReadsJson:
  # property scoped, read-only) and its write actions in CONNECT_WRITE_ACTIONS
  # (WritesJson: CSRF, the PYN_CONNECT_WRITES kill switch, `User#can_edit_map?`).
  class BaseController < ApplicationController
    CONNECT_READ_ACTIONS = [].freeze
    CONNECT_WRITE_ACTIONS = [].freeze

    # Anything unexpected (a CRM push raising inside a legacy callback, a
    # malformed payload reaching a legacy helper): the JSON envelope with a
    # reference, never the HTML error page the Connect client cannot read.
    # Declared first: Rails matches rescue handlers last-declared-first, so
    # the specific handlers of the concerns and of this class win over it.
    rescue_from StandardError, with: :render_connect_internal_error

    include Connect::WritesJson
    include Connect::ReadsJson

    # Every Connect endpoint is JSON whatever the request says. The read and
    # write guards of the two concerns (property scoping, CSRF, the kill
    # switch, `User#can_edit_map?`) are keyed on `connect_read?` /
    # `connect_write?`, and the routes keep Rails' optional `.:format`
    # segment, so a `.html` or `.xml` suffix must never become a way around
    # them: the format is forced before any other callback runs, and the two
    # predicates below ignore the format altogether. An action named in
    # neither list is unreachable (404).
    before_action :force_connect_json_format, prepend: true
    before_action :require_connect_action!

    # A domain error a service raises on purpose (an unknown device, a vendor
    # that could not be reached …): one envelope error with its code.
    rescue_from Connect::DomainError, with: :render_connect_domain_error

    private

      def force_connect_json_format
        request.format = :json
      end

      def connect_read?
        self.class::CONNECT_READ_ACTIONS.include?(action_name)
      end

      def connect_write?
        self.class::CONNECT_WRITE_ACTIONS.include?(action_name)
      end

      def require_connect_action!
        return if connect_read? || connect_write?

        render_connect_error(:not_found, code: 'not_found', message: 'No such endpoint.')
      end

      def render_connect_domain_error(error)
        render_connect_error(error.status, code: error.code, message: error.message, extra: error.extra)
      end

      def render_connect_internal_error(error)
        ref = SecureRandom.hex(6)
        Rails.logger.error("[Connect] internal_error ref=#{ref} #{request.method} #{request.path} #{error.class}: #{error.message}\n#{Array(error.backtrace).first(12).join("\n")}")
        raise error if Rails.env.test? && ENV['CONNECT_RAISE_INTERNAL'] == '1'

        render_connect_error(:internal_server_error, code: 'internal', message: 'Something went wrong on the server. Please try again.', extra: { ref: ref })
      end

      # The meta a write answers with carries what a read carries (the page
      # re-renders from the write's response).
      def connect_write_meta(extra = {})
        super(extra.merge(writes_enabled: Connect::Flags.writes_enabled?(@community), can_edit: current_user&.can_edit_map?(@community) == true,
                          is_super_admin: current_user&.is_super_admin? == true, time_zone: @community.get_time_zone))
      end

      # A super-admin-only write (visitor privacy actions).
      def require_super_admin!
        return if current_user&.is_super_admin?

        render_connect_error(:forbidden, code: 'forbidden', message: 'Only a super admin may do this.')
      end

      def boolean(value)
        ActiveModel::Type::Boolean.new.cast(value) == true
      end
  end
end

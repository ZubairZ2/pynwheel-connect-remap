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

    include Connect::WritesJson
    include Connect::ReadsJson

    # A domain error a service raises on purpose (an unknown device, a vendor
    # that could not be reached …): one envelope error with its code.
    rescue_from Connect::DomainError, with: :render_connect_domain_error

    private

      def render_connect_domain_error(error)
        render_connect_error(error.status, code: error.code, message: error.message, extra: error.extra)
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

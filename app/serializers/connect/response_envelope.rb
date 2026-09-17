module Connect
  # The single response shape every Pynwheel Connect (Next.js) endpoint returns:
  #
  #   { "data": ..., "meta": { ... }, "flash_messages": [ ... ] }
  #
  # Mirrors the `render_mobile_action_response` envelope documented in
  # react-architecture.md §14 so the frontend parser layer stays identical.
  class ResponseEnvelope
    def initialize(data:, meta: {}, flash_messages: [])
      @data = data
      @meta = meta
      @flash_messages = flash_messages
    end

    def as_json(*)
      {
        data: @data,
        meta: @meta,
        flash_messages: @flash_messages
      }
    end

    # Meta every listing carries: who is signed in (the Connect sidebar needs
    # it), the record count, and — for paginated listings — the page metadata
    # the frontend's pager renders from.
    def self.listing_meta(user, total_count, pagination: nil, extra: {})
      {
        total_count: total_count,
        current_user: current_user_meta(user),
        pagination: pagination
      }.merge(extra)
    end

    def self.current_user_meta(user)
      return nil if user.blank?

      full_name = [user.first_name, user.last_name].compact_blank.join(' ').presence

      {
        id: user.id,
        email: user.email,
        name: full_name || user.email,
        role: user.role,
        is_super_admin: user.is_super_admin?,
        company_id: user.company_id
      }
    end
  end
end

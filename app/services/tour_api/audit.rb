# frozen_string_literal: true

module TourApi
  # The audit row of a Tour App event, written the way Connect writes its
  # visitor events (a PaperTrail::Version on the property with a JSON
  # payload): who (`whodunnit` is the staff user's id or `visitor:<id>`),
  # what (`event`), where (`community_id`, `company_id`). Never a code, a
  # token or a phone number. A failure to write it is logged, never raised.
  module Audit
    module_function

    def record(community, event, whodunnit:, payload: {})
      PaperTrail::Version.create!(
        item_type: 'Community', item_id: community.id, event: event.to_s, whodunnit: whodunnit.to_s.presence,
        community_id: community.id, company_id: community.company_id, object: payload.to_json
      )
    rescue StandardError => e
      Rails.logger.warn("[tour-api] audit row not written event=#{event} #{e.class}: #{e.message[0, 120]}")
      nil
    end
  end
end

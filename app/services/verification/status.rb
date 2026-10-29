# frozen_string_literal: true

module Verification
  # What the Tour App needs to know about a visitor's ID verification and
  # card on file at one property (October 28, 2026): whether the property
  # asks, whether this visitor is current (`Visitors::Status.id_check`, the
  # 30-day rule), which provider, and whether a card must be on file first.
  # The same facts gate the check-in (`Visits::Start`) and the doors
  # (`Api::TourApp::V1::LocksController`); the app only displays them.
  module Status
    VALID_FOR_DAYS = (Visitors::Status::VERIFIED_FOR / 1.day).to_i

    module_function

    # Whether the check-in waits for a card on file: the property asks for ID
    # verification (the design's identity flow, whose third step the card is)
    # and its booking form asks for a card (`tours.credit_card_required`, which
    # the public widget collects at booking time and the app's own bookings do
    # not), and the visitor has none (`strip_customer_id`). On a property
    # without ID verification the flag keeps its legacy meaning (the widget's)
    # and never blocks a tour: `credit_card_required` defaulted to true on every
    # tour row until October 29, 2026 (new rows now default to false, existing
    # rows keep their value), so a gate on it alone would stop walk-ins on
    # every property set up before then.
    def card_needed?(community, visitor)
      tour = community.community_tour
      tour.present? && tour.visual_id_verification == true && tour.credit_card_required == true && visitor.strip_customer_id.blank?
    end

    def for(community, visitor, now: nil)
      tour = community.community_tour
      now ||= ::Visits::Rules.now(community)
      check = Visitors::Status.id_check(visitor, now)
      provider = tour&.verification_type.presence || Checkpoint::PROVIDER
      property_requires = tour&.visual_id_verification == true
      card_required = tour&.credit_card_required == true
      card_on_file = visitor.strip_customer_id.present?
      card_needed = card_needed?(community, visitor)
      {
        property_id: community.id,
        provider: provider,
        provider_available: provider == Checkpoint::PROVIDER && Checkpoint.configured?,
        property_requires: property_requires,
        required: ::Visits::Rules.verification_required?(community, visitor, now),
        state: check[:state],
        verified_at: check[:at]&.iso8601,
        valid_until: check[:valid_until]&.iso8601,
        verified_by: check[:provider],
        valid_for_days: VALID_FOR_DAYS,
        attempts_left: Attempt.attempts_left(community, visitor, now),
        document_types: Checkpoint::DOCUMENT_TYPES.map { |key, type| { key: key, label: type[:label], back: type[:back] } },
        card: {
          required: card_required,
          on_file: card_on_file,
          needed: card_needed,
          last4: card_on_file ? visitor.card_last_digits.presence : nil,
          available: Card.configured?,
          publishable_key: card_needed && Card.configured? ? Card.publishable_key : nil
        }
      }
    end
  end
end

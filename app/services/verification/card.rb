# frozen_string_literal: true

module Verification
  # The card on file a property may ask for before a tour
  # (`tours.credit_card_required`), saved the way the CMS's own scheduling
  # page saves it (`SchedualToursController#create`: a Stripe.js card token
  # → `StripeServices#create_customer` → `tour_users.strip_customer_id` and
  # `card_last_digits`). The card number and CVC never reach Rails: the app
  # tokenizes them with Stripe.js and the account's publishable key, and only
  # the `tok_…` id comes here (October 28, 2026). No charge is made.
  module Card
    extend StripeServices

    TOKEN = /\Atok_[A-Za-z0-9_]{4,}\z/

    module_function

    def configured?
      ENV['STRIPE_SECRET_KEY'].present? && ENV['STRIPE_PUBLISHABLE_KEY'].present?
    end

    def publishable_key
      ENV['STRIPE_PUBLISHABLE_KEY'].presence
    end

    def save!(community, visitor, token)
      tour = community.community_tour
      raise TourApi::ApiError.unprocessable('card_not_required', 'This property does not ask for a card on file.') unless tour&.credit_card_required && tour.visual_id_verification
      raise TourApi::ApiError.validation([{ loc: %w[body card_token], message: 'Input should be a Stripe card token' }]) unless token.is_a?(String) && token.match?(TOKEN)
      raise TourApi::ApiError.new(503, 'card_unavailable', 'Card collection is not available right now. Please contact the leasing office.') unless configured?

      card = Stripe::Token.retrieve(token)
      raise TourApi::ApiError.unprocessable('card_invalid', 'That card could not be used.') unless card.respond_to?(:card) && card.card
      raise TourApi::ApiError.unprocessable('card_invalid', 'That card was already used. Please enter it again.') if card.respond_to?(:used) && card.used

      customer = create_customer(visitor.email.presence || "visitor-#{visitor.id}@pynwheel.invalid", token)
      visitor.update_columns(strip_customer_id: customer.id, card_last_digits: card.card.last4.to_s)
      TourApi::Audit.record(community, 'card_saved', whodunnit: "visitor:#{visitor.id}", payload: { tour_user_id: visitor.id, last4: card.card.last4.to_s })
      card.card.last4.to_s
    rescue Stripe::CardError => e
      raise TourApi::ApiError.unprocessable('card_declined', e.message.presence || 'The card was declined.')
    rescue Stripe::InvalidRequestError => e
      Rails.logger.warn("[tour-api] card token refused community=#{community.id} tour_user=#{visitor.id} #{e.class}")
      raise TourApi::ApiError.unprocessable('card_invalid', 'That card could not be used. Please enter it again.')
    rescue Stripe::StripeError => e
      Rails.logger.warn("[tour-api] stripe unavailable community=#{community.id} #{e.class}: #{e.message[0, 120]}")
      raise TourApi::ApiError.new(503, 'card_unavailable', 'Card collection is not available right now. Please try again in a moment.')
    end
  end
end

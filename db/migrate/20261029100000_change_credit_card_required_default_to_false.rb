# frozen_string_literal: true

# `tours.credit_card_required` was created with a default of true, so every
# property ever set up asked the public widget for a card at booking unless
# someone untoggled it in Tour Settings, and the Tour App's identity flow
# (October 28, 2026) would have asked a card of every verified-ID property's
# visitor. Owner decision, October 29, 2026: a new tour row does not ask for a
# card unless the setting is switched on. Existing rows keep whatever they
# hold; this changes the default only.
class ChangeCreditCardRequiredDefaultToFalse < ActiveRecord::Migration[7.2]
  def change
    change_column_default :tours, :credit_card_required, from: true, to: false
  end
end

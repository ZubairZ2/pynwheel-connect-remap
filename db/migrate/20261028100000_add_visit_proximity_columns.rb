# frozen_string_literal: true

# What the Tour App's check-in now records about the phone's position
# (October 28, 2026): the fix's reported accuracy and time, and the server's
# verdict (`verified`, `outside`, `unverified_no_fix`,
# `unverified_poor_accuracy`, `unverified_no_property_coords`). Additive;
# legacy rows keep nil and are read as "no fix".
class AddVisitProximityColumns < ActiveRecord::Migration[7.2]
  def change
    add_column :tour_histories, :accuracy_m, :integer
    add_column :tour_histories, :fix_at, :datetime
    add_column :tour_histories, :proximity, :string
  end
end

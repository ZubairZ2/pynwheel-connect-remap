class UpdateLatchBehaviour < ActiveRecord::Migration[5.0]
    def change
      drop_table :latch_allowed_accesses
      add_reference :latch_guests, :guest_of_stop, polymorphic: true
    end
  end
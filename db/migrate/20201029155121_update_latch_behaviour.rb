class UpdateLatchBehaviour < ActiveRecord::Migration[5.0]
    def change
      add_reference :latch_guests, :guest_of_stop, polymorphic: true
    end
  end
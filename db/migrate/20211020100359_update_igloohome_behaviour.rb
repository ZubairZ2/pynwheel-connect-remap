class UpdateIgloohomeBehaviour < ActiveRecord::Migration[5.0]
  def change
    add_reference :igloohome_guests, :guest_of_stop, polymorphic: true, index: {:name => "index_igloohome_guest_of_stop"}
  end
end

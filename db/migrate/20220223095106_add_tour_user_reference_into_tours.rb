class AddTourUserReferenceIntoTours < ActiveRecord::Migration[5.0]
  def change
    add_reference :tours, :tour_user, foreign_key: true
  end
end

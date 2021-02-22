class AddVerifiedByFieldToTourHistories < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_histories, :verified_by, :string
    add_column :tour_users, :verified_by, :string
  end
end

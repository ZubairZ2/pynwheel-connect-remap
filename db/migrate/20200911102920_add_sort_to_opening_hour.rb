class AddSortToOpeningHour < ActiveRecord::Migration[5.0]
  def change
    add_column :opening_hours, :sort, :integer
  end
end

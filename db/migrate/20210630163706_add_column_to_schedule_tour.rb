class AddColumnToScheduleTour < ActiveRecord::Migration[5.0]
  def change
    add_column :schedual_tours, :created_by, :string, default: "Pynwheel"
  end
end

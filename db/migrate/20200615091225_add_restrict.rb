class AddRestrict < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :restrict_access, :boolean, default: false
  end
end

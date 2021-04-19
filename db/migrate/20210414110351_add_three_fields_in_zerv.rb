class AddThreeFieldsInZerv < ActiveRecord::Migration[5.0]
  def change
    add_column :zervs, :facility_id, :string
    add_column :zervs, :badge_id, :string
    add_column :zervs, :card_format, :string
  end
end

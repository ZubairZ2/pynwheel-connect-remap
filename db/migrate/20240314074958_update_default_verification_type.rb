class UpdateDefaultVerificationType < ActiveRecord::Migration[5.0]
  def change
    change_column :tours, :verification_type, :string, default: "check_point_id"
  end
end

class AddCustomerIdIntoZerv < ActiveRecord::Migration[5.0]
  def change
    add_column :zervs, :customer_id, :string, default: ""
  end
end

class AddLimitResultFieldToCredentails < ActiveRecord::Migration[5.0]
  def change
    add_column :credentials, :limit_result, :boolean, default: true
  end
end

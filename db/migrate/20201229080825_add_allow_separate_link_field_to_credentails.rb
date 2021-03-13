class AddAllowSeparateLinkFieldToCredentails < ActiveRecord::Migration[5.0]
  def change
    change_column :credentials, :apply_now, :string
  end
end

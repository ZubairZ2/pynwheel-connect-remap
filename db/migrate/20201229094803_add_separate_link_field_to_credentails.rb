class AddSeparateLinkFieldToCredentails < ActiveRecord::Migration[5.0]
  def change
    add_column :credentials, :separate_link, :string
  end
end

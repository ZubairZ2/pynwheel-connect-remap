class AddEntrataUrlFieldToCredentials < ActiveRecord::Migration[5.0]
  def change
    add_column :credentials, :entrata_url, :string
  end
end

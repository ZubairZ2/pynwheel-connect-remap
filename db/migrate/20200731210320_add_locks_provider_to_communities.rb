class AddLocksProviderToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :locks_provider, :string
  end
end

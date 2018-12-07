class AddCodeToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :code, :string
  end
end

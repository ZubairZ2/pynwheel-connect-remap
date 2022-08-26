class AddFileToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :file, :string
  end
end

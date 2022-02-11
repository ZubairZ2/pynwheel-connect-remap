class AddFileToLatch < ActiveRecord::Migration[5.0]
  def change
    add_column :latches, :file, :string
  end
end

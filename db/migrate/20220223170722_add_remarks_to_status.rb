class AddRemarksToStatus < ActiveRecord::Migration[5.0]
  def change
    add_column :statuses  , :remarks , :text
  end
end

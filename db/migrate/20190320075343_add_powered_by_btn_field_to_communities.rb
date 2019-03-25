class AddPoweredByBtnFieldToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :powered_by_btn, :boolean
  end
end

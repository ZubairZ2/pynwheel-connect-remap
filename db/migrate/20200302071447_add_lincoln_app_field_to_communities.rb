class AddLincolnAppFieldToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :lincoln_app, :boolean, default: false
  end
end

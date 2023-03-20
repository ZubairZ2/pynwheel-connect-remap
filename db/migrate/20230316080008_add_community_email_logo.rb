class AddCommunityEmailLogo < ActiveRecord::Migration[5.0]
  def up
    add_column :communities, :email_logo, :string, default: "", if_exists: false
  end

  def down
    remove_column :communities, :email_logo, if_exists: true
  end
end

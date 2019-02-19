class ChangeEmailBody < ActiveRecord::Migration[5.0]
  def change
    change_column :favorite_settings, :email_body, :string, default: "Thank you for visiting <community_name>! Here are your favorites. Click on the images below to expand them.

We look forward to seeing you again soon."
  end
end

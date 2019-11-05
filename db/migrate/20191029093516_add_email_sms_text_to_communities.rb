class AddEmailSmsTextToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :sms_text, :text
    add_column :communities, :email_text, :text
  end
end

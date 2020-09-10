class AddOneDayEmailTextFieldToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :one_day_email_text, :string
    add_column :communities, :one_hour_email_text, :string
  end
end

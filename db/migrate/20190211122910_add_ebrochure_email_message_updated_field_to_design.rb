class AddEbrochureEmailMessageUpdatedFieldToDesign < ActiveRecord::Migration[5.0]
  def change
    add_column :designs, :ebrochure_email_message_updated, :boolean, default: false
  end
end

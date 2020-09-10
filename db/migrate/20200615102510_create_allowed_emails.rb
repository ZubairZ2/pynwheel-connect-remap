class CreateAllowedEmails < ActiveRecord::Migration[5.0]
  def change
    create_table :allowed_emails do |t|
      t.string :email
      t.references :community, foreign_key: true

      t.timestamps
    end
  end
end

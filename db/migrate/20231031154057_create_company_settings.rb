class CreateCompanySettings < ActiveRecord::Migration[5.0]
  def change
    create_table :company_settings do |t|
      t.boolean :company_level_data_import, default: false
      t.references :company, foreign_key: true

      t.timestamps
    end
  end
end

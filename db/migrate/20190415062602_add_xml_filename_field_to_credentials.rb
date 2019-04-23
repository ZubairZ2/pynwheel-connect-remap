class AddXmlFilenameFieldToCredentials < ActiveRecord::Migration[5.0]
  def change
    add_column :credentials, :xml_filename, :string
    add_column :credentials, :xml_domain, :string
  end
end

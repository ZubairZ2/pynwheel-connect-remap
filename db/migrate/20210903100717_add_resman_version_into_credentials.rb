class AddResmanVersionIntoCredentials < ActiveRecord::Migration[5.0]
  def change
    add_column :credentials, :resman_api_version, :string,  default: "GetMarketing2_0"
  end
end

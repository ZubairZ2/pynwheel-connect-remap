class RemanApiDefaultValue < ActiveRecord::Migration[5.0]
  def change
    change_column :credentials, :resman_api_version, :string,  default: "GetMarketing4_0"
  end
end
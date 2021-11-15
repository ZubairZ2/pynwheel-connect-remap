class AddPerqAttributesIntoCredentials < ActiveRecord::Migration[5.0]
  def change
    add_column :credentials, :perq_property_id, :string
    add_column :credentials, :is_perq_allowed, :boolean, default: false
  end
end

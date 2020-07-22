class AddThankYouMessageToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :thank_you_message, :string
  end
end

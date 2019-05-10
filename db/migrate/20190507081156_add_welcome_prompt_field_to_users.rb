class AddWelcomePromptFieldToUsers < ActiveRecord::Migration[5.0]
  def change
    add_column :users, :welcome_prompt, :boolean,default: false
  end
end

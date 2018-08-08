class AddBackgroundImageFieldsToExpressionists < ActiveRecord::Migration[5.0]
  def change
    add_column :expressionists, :application_background_image, :string
    add_column :expressionists, :display_application_background_image, :boolean,default: false
  end
end

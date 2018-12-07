class AddSpacingBetweenButtonsForHomepageFieldToExpressionists < ActiveRecord::Migration[5.0]
  def change
    add_column :expressionists, :spacing_between_buttons_for_homepage, :string
  end
end

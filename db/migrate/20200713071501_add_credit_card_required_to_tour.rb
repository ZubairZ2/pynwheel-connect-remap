class AddCreditCardRequiredToTour < ActiveRecord::Migration[5.0]
  def change
    add_column :tours, :credit_card_required, :boolean, default: true
  end
end

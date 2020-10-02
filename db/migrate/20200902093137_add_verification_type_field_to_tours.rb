class AddVerificationTypeFieldToTours < ActiveRecord::Migration[5.0]
  def change
    add_column :tours, :verification_type, :string, default: "authenteq"
  end
end

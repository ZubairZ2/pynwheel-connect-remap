class AddCompanyIdToCredentials < ActiveRecord::Migration[5.0]
  def change
    add_reference :credentials, :company, foreign_key: true
  end
end

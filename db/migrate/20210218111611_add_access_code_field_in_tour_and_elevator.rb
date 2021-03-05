class AddAccessCodeFieldInTourAndElevator < ActiveRecord::Migration[5.0]
  
  def up
    add_column :tours, :access_code, :string
    add_column :elevators, :access_code, :string
  end

  def down
    remove_column :tours, :access_code, :string
    remove_column :elevators, :access_code, :string
  end

end

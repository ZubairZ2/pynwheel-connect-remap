class CreateLaunchRemotes < ActiveRecord::Migration[5.0]
  def change
    create_table :launch_remotes do |t|
      t.references :community
      t.timestamps
    end
  end
end

class AddCommentTable < ActiveRecord::Migration[5.0]
  def change
    create_table :comments do |t|
      t.bigint :commentable_id
      t.string :commentable_type
      t.text :content
      t.integer :whodunit

      t.timestamps
    end
  end
end

class CreateFeedbacks < ActiveRecord::Migration[5.0]
  def change
    create_table :feedbacks do |t|
      t.float :rating
      t.text :comment
      t.boolean :is_cancelled
      t.datetime :cancelled_at
      t.references :tour_user, foreign_key: true
      t.references :tour, foreign_key: true

      t.timestamps
    end
  end
end

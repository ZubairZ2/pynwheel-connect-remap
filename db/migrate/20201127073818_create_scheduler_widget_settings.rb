class CreateSchedulerWidgetSettings < ActiveRecord::Migration[5.0]
  def change
    create_table :scheduler_widget_settings do |t|
      t.string :btn_text, default: "Schedule a Visit"
      t.string :btn_color, default: "#20a345"
      t.integer :btn_width, default: "130"
      t.integer :btn_height, default: "35"
      t.string :btn_font, default: "Open Sans Regular"
      t.string :btn_font_size, default: "14px"
      t.references :tour, foreign_key: true

      t.timestamps
    end
  end
end

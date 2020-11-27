class CreateSchedulerWidgetSettings < ActiveRecord::Migration[5.0]
  def change
    create_table :scheduler_widget_settings do |t|
      t.string :btn_text
      t.string :btn_color
      t.string :btn_font
      t.font_size :btn

      t.timestamps
    end
  end
end

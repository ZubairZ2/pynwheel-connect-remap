class RenameApplyClickCounterField < ActiveRecord::Migration[5.0]
  def change
    rename_column :tour_histories, :apply_clicks_counter, :apply_click_counter
  end
end

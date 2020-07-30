class AddSchedulerWidgetFieldToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :scheduler_widget, :boolean
    add_column :communities, :pynwheel_touch, :boolean
  end
end

class AddApplyNowSelfTourFieldToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :apply_now_self_tour, :boolean
    add_column :communities, :apply_now_pynwheel_touch, :boolean
    add_column :communities, :apply_now_pynwheel_touch_and_go, :boolean
  end
end

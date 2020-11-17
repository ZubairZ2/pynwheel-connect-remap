class ChangeDefaultvalueApplyNow < ActiveRecord::Migration[5.0]
  def change
  	change_column_default :credentials, :apply_now, true
  	change_column_default :communities, :apply_now_pynwheel_touch, true
  	change_column_default :communities, :apply_now_pynwheel_touch_and_go, true
  	change_column_default :communities, :apply_now_self_tour, true
  end
end

class AddIframeEnableFor3DtourFieldToUnits < ActiveRecord::Migration[5.0]
  def change
    add_column :units, :iframe_enable_for_3Dtour, :boolean, default: true
    add_column :floorplans, :iframe_enable_for_3Dtour, :boolean, default: true
    add_column :webpages, :iframe_enable_for_3Dtour, :boolean, default: false
  end
end

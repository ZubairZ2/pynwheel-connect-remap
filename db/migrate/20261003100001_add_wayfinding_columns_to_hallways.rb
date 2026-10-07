# Hallway nodes gain the provenance and review state the Connect Map &
# Plotting editor needs (hand-drawn vs detected, pending vs confirmed), the
# coordinate space they were drawn in, the property they belong to, and the
# detection run that proposed them.
#
# Every column is nullable or defaulted so that an existing row reads as a
# hand-drawn, confirmed, floor-image-pixel node: exactly what every row is
# today. The legacy editor (`HallwaysController`) keeps creating rows that
# take these defaults; `maps.js` ignores the extra keys in its JSON.
class AddWayfindingColumnsToHallways < ActiveRecord::Migration[7.2]
  def up
    add_column :hallways, :source, :string, null: false, default: 'manual' unless column_exists?(:hallways, :source)
    add_column :hallways, :review_status, :string, null: false, default: 'confirmed' unless column_exists?(:hallways, :review_status)
    add_column :hallways, :confidence, :float unless column_exists?(:hallways, :confidence)
    add_column :hallways, :space, :string, null: false, default: 'raster' unless column_exists?(:hallways, :space)
    add_column :hallways, :community_id, :integer unless column_exists?(:hallways, :community_id)
    add_column :hallways, :detection_run_id, :bigint unless column_exists?(:hallways, :detection_run_id)
    add_column :hallways, :confirmed_at, :datetime unless column_exists?(:hallways, :confirmed_at)
    add_column :hallways, :created_by_user_id, :integer unless column_exists?(:hallways, :created_by_user_id)

    add_index :hallways, :community_id unless index_exists?(:hallways, :community_id)
    unless index_exists?(:hallways, %i[parent_type parent_id review_status space], name: 'index_hallways_routable_lookup')
      add_index :hallways, %i[parent_type parent_id review_status space], name: 'index_hallways_routable_lookup'
    end
    unless index_name_exists?(:hallways, 'index_hallways_natural_key')
      add_index :hallways, 'parent_type, parent_id, space, (round(x_plot)::int), (round(y_plot)::int)', name: 'index_hallways_natural_key'
    end

    # Backfill from the parent map. Orphan rows (a parent that was deleted)
    # stay NULL and are left to the repair task.
    execute <<~SQL
      UPDATE hallways h SET community_id = f.community_id
        FROM floorplates f
       WHERE h.parent_type = 'Floorplate' AND h.parent_id = f.id AND h.community_id IS NULL;
    SQL
    execute <<~SQL
      UPDATE hallways h SET community_id = s.community_id
        FROM sitemaps s
       WHERE h.parent_type = 'Sitemap' AND h.parent_id = s.id AND h.community_id IS NULL;
    SQL
  end

  def down
    remove_index :hallways, name: 'index_hallways_natural_key' if index_name_exists?(:hallways, 'index_hallways_natural_key')
    remove_index :hallways, name: 'index_hallways_routable_lookup' if index_name_exists?(:hallways, 'index_hallways_routable_lookup')
    remove_index :hallways, :community_id if index_exists?(:hallways, :community_id)
    %i[source review_status confidence space community_id detection_run_id confirmed_at created_by_user_id].each do |column|
      remove_column :hallways, column if column_exists?(:hallways, column)
    end
  end
end

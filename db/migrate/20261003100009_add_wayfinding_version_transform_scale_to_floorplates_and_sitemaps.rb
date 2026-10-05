# Per-level wayfinding metadata:
#   - `wayfinding_version`: compare-and-swap counter for Connect graph saves
#     (a stale editor gets a 409 instead of overwriting newer data);
#   - `svg_to_image_transform`: the affine map from the floor SVG's viewBox to
#     the floor image's pixels, when it can be derived or calibrated
#     ({a,b,c,d,e,f, method, viewBox});
#   - `scale_ft_per_px`: real-world scale, entered once per plan; nil until then.
class AddWayfindingVersionTransformScaleToFloorplatesAndSitemaps < ActiveRecord::Migration[7.2]
  def change
    %i[floorplates sitemaps].each do |table|
      add_column table, :wayfinding_version, :integer, null: false, default: 0
      add_column table, :svg_to_image_transform, :jsonb
      add_column table, :scale_ft_per_px, :decimal, precision: 10, scale: 6
    end
  end
end

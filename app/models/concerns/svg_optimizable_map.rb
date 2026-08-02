# One uniform way for the SVG optimizer (controller + worker) to read and
# rewrite whichever uploader holds a target's live map file, so it never has to
# branch on the target's class.
#
# Floorplates and sitemaps keep that file in `svg_image`. A Beans-generated
# property additionally has ONE shared background map — the static base layer
# every floor SVG overlays — which lives on the community itself, in
# `background_svg_image`. Both are optimized through the same pipeline.
module SvgOptimizableMap
  extend ActiveSupport::Concern

  included do
    class_attribute :svg_optimizer_column, instance_writer: false, default: :svg_image
  end

  # The CarrierWave uploader for this target's live map file.
  def optimizable_svg
    public_send(svg_optimizer_column)
  end

  # Assigns new bytes through the model's normal CarrierWave path — the same
  # mechanism a manual CMS re-upload uses.
  def optimizable_svg=(file)
    public_send("#{svg_optimizer_column}=", file)
  end
end

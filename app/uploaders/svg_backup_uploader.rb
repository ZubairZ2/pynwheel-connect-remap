# Minimal, unmounted uploader used only by SvgOptimizationWorker to snapshot
# a Floorplate/Sitemap's svg_image to a separate, uniquely-keyed location
# BEFORE it gets overwritten. Not mounted on any model — used standalone via
# `SvgBackupUploader.new.tap { |u| u.community_id = ...; u.backup_key = ... }.store!(file)`.
#
# Storage layout is a property-id-first "repo" so backups can be bulk-purged
# per property later with a single prefix delete, once a property's
# optimization is confirmed stable and its backups are no longer needed:
#   uploads/svg_optimizer_backups/<community_id>/<target_type>/<target_id>/<run_id>-<timestamp>-original.svg
#
# Shares the same Fog/S3 credentials as SiteMapUploader via CarrierWave's
# global config, just a different store_dir so backups never collide with,
# or get swept up by, live-upload logic.
class SvgBackupUploader < CarrierWave::Uploader::Base
  storage Rails.env.development? ? :file : :fog

  attr_accessor :community_id, :backup_key

  def store_dir
    "uploads/svg_optimizer_backups/#{community_id}"
  end

  def filename
    backup_key
  end
end

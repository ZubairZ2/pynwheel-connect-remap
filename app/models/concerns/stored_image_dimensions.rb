# Pixel dimensions of a mounted image, read from the file at most once.
#
# `image.width` and `image.height` look like attribute reads and are not.
# CarrierWave's RMagick#width and #height each call
# `Magick::Image.from_blob(read)` on their own, and under `storage :fog` that
# `read` downloads the entire object from S3. Asking one record for both
# therefore costs two downloads and two full ImageMagick decodes -- and the SDK
# payload asks every floorplate on the property, which is 56 round trips on a
# 28-floor building, on every single request.
#
# Development never shows this. Storage is :file there, so the same `read` is a
# local disk read and the cost vanishes into the noise -- which is exactly why
# this survived so long.
#
# A stored file's dimensions do not change, so they are decoded once and written
# to the width/height columns that exist to hold them. Every later request reads
# the row instead of the file.
module StoredImageDimensions
  extend ActiveSupport::Concern

  # [width, height] in pixels, memoised for this instance.
  def stored_image_dimensions
    @stored_image_dimensions ||= begin
      decoded = decode_image_dimensions
      persist_image_dimensions(decoded)
      decoded
    end
  end

  private

  # One download, one decode, both numbers. RMagick frames hold memory outside
  # Ruby's heap, so the frame is destroyed rather than left to the GC.
  def decode_image_dimensions
    frame = ::Magick::Image.from_blob(image.read).first
    [frame.columns, frame.rows]
  ensure
    frame&.destroy! rescue nil
  end

  # Writes back only the columns that held nothing usable, so a hand-corrected
  # width is never overwritten by whatever the file happens to say.
  # update_columns because these are derived facts about the stored file, not an
  # edit: no callbacks, no updated_at, nothing to make a sync think the row
  # changed.
  #
  # A failure here must never reach the caller. On a read-only replica this
  # raises, and the callers rescue into 0 -- which would hand the map a zero
  # width. The dimensions are already in hand; persisting them is an
  # optimisation for the next request, not part of this answer.
  def persist_image_dimensions(dimensions)
    return unless persisted?

    updates = {}
    updates[:width]  = dimensions[0] if width.to_f  <= 0
    updates[:height] = dimensions[1] if height.to_f <= 0
    update_columns(updates) if updates.any?
  rescue => e
    Rails.logger.warn("[#{self.class.name} #{id}] could not persist image dimensions: #{e.class}: #{e.message}")
  end
end

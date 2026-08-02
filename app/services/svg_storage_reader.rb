# Reads a CarrierWave-stored SVG's current bytes storage-agnostically, so the
# same code works in production (fog/S3 https URLs) and development (:file
# storage local paths like "/uploads/..."). Shared by SvgOptimizationWorker
# (which reads the live file before overwriting it) and SvgOptimizerController
# (which reads it to analyze/preview in memory, without writing anything).
require "open-uri"

module SvgStorageReader
  MAX_FETCH_BYTES = 25.megabytes

  module_function

  # Reads the bytes an uploader currently points at, or nil if it has none.
  def read_uploader(uploader)
    return nil unless uploader.present? && uploader.url.present?
    read_url(uploader.url)
  end

  # Reads from either a remote http(s) URL (production/fog) or a local
  # CarrierWave :file path like "/uploads/..." (development).
  def read_url(url)
    return nil if url.blank?

    if url.start_with?("http://", "https://")
      URI.parse(url).open(read_timeout: 30) { |io| read_capped(io) }
    else
      path = Rails.root.join("public", url.sub(%r{\A/}, "").split("?").first)
      File.binread(path).force_encoding("UTF-8")
    end
  rescue OpenURI::HTTPError, Errno::ENOENT => e
    Rails.logger.warn("[SvgStorageReader] read_url failed for #{url}: #{e.message}")
    nil
  end

  def read_capped(io)
    body = +""
    while (chunk = io.read(64 * 1024))
      body << chunk
      raise "Remote file exceeded #{MAX_FETCH_BYTES / 1.megabyte}MB cap." if body.bytesize > MAX_FETCH_BYTES
    end
    body.force_encoding("UTF-8")
  end
end

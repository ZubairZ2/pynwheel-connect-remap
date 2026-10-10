# Builds the Pynwheel Touch home screen payload served by
# GET /api/partner/maps/fetch_homescreen.
#
# Same shape as the `homescreen` block of /api/v1/communities/:id/data.json —
# { images: [{ filename, url }], video, loop_type } — so the touch UI can read
# either source. Kept off the map boot path: only a touch kiosk asks for it.
#
# Differences from the jbuilder, all deliberate:
#   * Image URLs come from the denormalised large_image_url column (no uploader
#     touched), S3-accelerated like every other SDK asset, with a `?v=` buster
#     in place of the malformed `?temp/<crop_x><filename>` string.
#   * The Gables-only `secondary_images` block is not carried over.
class SdkHomescreenBuilderService
  LOOP_IMAGES = "images".freeze

  def initialize(community, asset_host: nil)
    @community  = community
    @design     = community.design
    @asset_host = asset_host
  end

  def build
    video = video_url

    {
      images:    images,
      video:     video,
      # A video loop with no video to play would show a blank screen.
      loop_type: video.present? ? (@design.loop_type.presence || LOOP_IMAGES) : LOOP_IMAGES
    }
  end

  private

  def images
    rows = @design&.home_page_images&.to_a
    return default_images if rows.blank?

    rows.filter_map do |img|
      url = versioned(accelerate(img.large_image_url.presence || img.standard_image_url), img)
      { filename: img.name, url: url } if url.present?
    end
  end

  # Stock artwork for a property that has not uploaded its own.
  def default_images
    DefaultImage.order(:id).filter_map do |img|
      url = default_image_url(img.image)
      { filename: img.name, url: url } if url.present?
    end
  end

  def video_url
    video = @design&.home_page_video
    return nil if video.blank?

    url = video.video.url.presence || video.url.presence
    versioned(accelerate(url), video)
  rescue StandardError
    nil
  end

  def default_image_url(path)
    return nil if path.blank?

    ActionController::Base.helpers.asset_url(path, host: @asset_host)
  rescue StandardError
    nil
  end

  # HomePageImage / HomePageVideo don't mix in S3Acceleration; Community does.
  # Local file storage (development) yields host-relative "/uploads/..." paths,
  # which would resolve against the SDK host page's origin, not this app's.
  def accelerate(url)
    return nil if url.blank?
    return "#{@asset_host}#{url}" if url.start_with?("/") && !url.start_with?("//") && @asset_host.present?

    @community.convert_to_s3_accelerate_url(url)
  end

  # Crops re-save under the same filename, so bust caches on updated_at.
  def versioned(url, record)
    return nil if url.blank?

    stamp = record.updated_at&.to_i
    return url if stamp.nil?

    url.include?("?") ? "#{url}&v=#{stamp}" : "#{url}?v=#{stamp}"
  end
end

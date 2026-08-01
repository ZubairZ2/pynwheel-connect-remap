# Builds the property gallery payload served by
# GET /api/partner/maps/fetch_gallery.
#
# Deliberately separate from SdkPayloadBuilderService: that service runs on every
# map boot, while the gallery is fetched only when a visitor actually opens the
# gallery panel. Nothing here belongs on the boot path — the map payload carries
# only the small discovery block (see #enabled? / #image_count).
class SdkGalleryBuilderService
  # Most video rows never got a `video_thumbnail` version generated, because
  # GalleryUploader#video? tests for an "application/*" content type and mp4
  # uploads rarely report one. We still hand back the generated URL as posterUrl,
  # with this long-standing placeholder as posterFallbackUrl for the client to
  # swap in on error. The legacy jbuilder used the placeholder unconditionally.
  LEGACY_VIDEO_POSTER =
    "https://images-pynwheel-cms-v2.s3.amazonaws.com/uploads/amenity/image/124/124-1518624577-video-placeholder.jpg".freeze

  VIDEO_EXTENSIONS = %w[.mp4 .mov .m4v .webm .ogv].freeze

  DEFAULT_PAGE_NAME = "Gallery".freeze

  def initialize(community)
    @community = community
  end

  # The gallery is a Pynwheel Touch feature, so it needs both the product toggle
  # and the property's own "show gallery" switch.
  def enabled?
    @community.pynwheel_touch_enabled? && @community.show_gallery?
  end

  # Cheap COUNT for the discovery block in the map payload — never loads rows.
  # Counted through galleries so it matches exactly what #build would return.
  def image_count
    return 0 unless enabled?
    gallery_images_scope.count
  end

  # Every gallery with its images nested underneath, ordered by the CMS sort.
  # Galleries with nothing renderable are omitted entirely.
  #
  # fav_ids: Set of favorited gallery image ids as strings, as held by the
  # controller for every other favouritable collection.
  def build(fav_ids = Set.new)
    return [] unless enabled?

    @community.galleries.order(:sort).includes(:gallery_images).filter_map do |gallery|
      images = sorted_images(gallery).filter_map { |row| image_json(row, gallery, fav_ids) }
      next if images.empty?

      {
        id:       gallery.id,
        title:    gallery.name,
        count:    images.size,
        coverUrl: cover_url(images),
        images:   images
      }
    end
  end

  # Favorited images as one flat list, for the favorites screen. Reuses #build so
  # URL, video and ordering rules live in exactly one place — the same way
  # floorplans_json / amenities_json are reused in get_favorites.
  def favorites_json(fav_ids)
    build(fav_ids).flat_map { |gallery| gallery[:images] }.select { |image| image[:isFavorite] }
  end

  private

  def gallery_images_scope
    GalleryImage.where(gallery_id: @community.galleries.select(:id))
  end

  # Thumbnail for the gallery list. First image in sort order, so the CMS drag
  # handle doubles as cover-image control with nothing new to configure.
  def cover_url(rows)
    first = rows.first
    return nil if first.nil?
    first[:thumbUrl] || first[:posterUrl] || first[:url]
  end

  # Gallery#gallery_images carries no order scope, unlike the community-level
  # association. Rows never given a sort position go last, in insertion order.
  def sorted_images(gallery)
    gallery.gallery_images.sort_by { |row| [row.sort || Float::INFINITY, row.id] }
  end

  # Returns nil for rows with nothing renderable — a half-finished upload should
  # drop out of the payload rather than reach the client as a broken tile.
  def image_json(row, gallery, fav_ids)
    video = video?(row)
    url   = video ? video_url(row) : image_url(row)
    return nil if url.blank?

    {
      id:                row.id,
      categoryId:        gallery.id,
      type:              gallery.name,
      name:              row.name.presence,
      url:               url,
      thumbUrl:          video ? nil : thumb_url(row),
      posterUrl:         video ? finalize(version_url(row, :video_thumbnail), row) : nil,
      posterFallbackUrl: video ? LEGACY_VIDEO_POSTER : nil,
      isVideo:           video,
      isFavorite:        fav_ids.include?(row.id.to_s)
    }
  end

  # Read the stored filename straight off the columns rather than asking
  # GalleryImage#is_video?, which instantiates the file object and returns true
  # whenever that raises — mislabelling every broken row as a video.
  def video?(row)
    [row.read_attribute(:video), row.read_attribute(:image), row.standard_image_url]
      .any? { |candidate| VIDEO_EXTENSIONS.include?(extension_of(candidate)) }
  end

  def extension_of(value)
    File.extname(value.to_s.split("?").first.to_s).downcase
  end

  # Full-resolution asset for the lightbox. Prefers the denormalised columns over
  # the uploader: cheaper, and it still resolves for legacy rows whose file is
  # gone. Note the 1920px `large` version exists only for images.
  def image_url(row)
    finalize(row.large_image_url.presence || row.standard_image_url.presence || version_url(row), row)
  end

  # 640x360 version — what a grid should render. The legacy jbuilder only ever
  # shipped the 1920px original, so every tile pulled a full-resolution file.
  def thumb_url(row)
    finalize(version_url(row, :thumb), row)
  end

  def video_url(row)
    raw = row.video.present? ? safe_url(row.video) : row.standard_image_url.presence
    finalize(raw, row)
  end

  # Raw uploader URL — callers run it through #finalize.
  def version_url(row, version = nil)
    return nil if row.image.blank?
    version ? safe_url(row.image, version) : safe_url(row.image)
  end

  def safe_url(uploader, version = nil)
    version ? uploader.url(version) : uploader.url
  rescue StandardError
    nil
  end

  # S3 Transfer Acceleration (as every other SDK asset gets) plus a version
  # query param. The buster matters because GalleryUploader reuses the original
  # filename once a crop is set, so a re-crop otherwise serves from cache
  # forever. Replaces the malformed `?temp/<crop_x><filename>` string the
  # jbuilder appended.
  def finalize(url, row)
    return nil if url.blank?

    accelerated = row.convert_to_s3_accelerate_url(url)
    stamp       = row.updated_at&.to_i
    return accelerated if stamp.nil?

    accelerated.include?("?") ? "#{accelerated}&v=#{stamp}" : "#{accelerated}?v=#{stamp}"
  end
end

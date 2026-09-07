# Builds the property gallery payload served by
# GET /api/partner/maps/fetch_gallery.
#
# Deliberately separate from SdkPayloadBuilderService: that service runs on every
# map boot, while the gallery is fetched only when a visitor actually opens the
# gallery panel. Nothing here belongs on the boot path — the map payload carries
# only the small discovery block (see #image_count).
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

  # Cheap COUNT for the discovery block in the map payload — never loads rows.
  # Counted through galleries so it matches exactly what #build would return.
  def image_count
    gallery_images_scope.count
  end

  # The gallery list — what the sidebar renders: name, photo count, cover
  # thumbnail. No `images` array, so a property with hundreds of photos answers
  # the panel-open request with a few hundred bytes instead of megabytes. The
  # images for whichever gallery the visitor actually opens come from
  # #images_for.
  #
  # Counts here are exact rather than a COUNT(*): they come from the same
  # filter that drops unrenderable rows, so the sidebar's "9 Photos" always
  # matches the number of tiles #images_for returns.
  def list
    each_gallery(Set.new).map { |gallery, images| summary_json(gallery, images) }
  end

  # One gallery's images. Scoped to a single gallery, so opening a second
  # gallery costs only that gallery.
  #
  # Returns [] for an id that is not this community's — ownership is enforced
  # here rather than trusted from the query string.
  def images_for(gallery_id, fav_ids = Set.new)
    gallery = @community.galleries.includes(:gallery_images).find_by(id: gallery_id)
    return [] if gallery.nil?

    sorted_images(gallery).filter_map { |row| image_json(row, gallery, fav_ids) }
  end

  # Favorited images as one flat list, for the favorites screen. Goes through
  # the same #each_gallery walk as #list and #images_for, so URL, video and
  # ordering rules live in exactly one place — the same way floorplans_json /
  # amenities_json are reused in get_favorites.
  def favorites_json(fav_ids)
    each_gallery(fav_ids).flat_map { |_gallery, images| images }.select { |image| image[:isFavorite] }
  end

  private

  # The one definition of "a gallery worth showing": CMS sort order, images
  # built through the same filter, and galleries left with nothing renderable
  # dropped. #build, #list and the favorites flat list all read from here so
  # they can never disagree about what exists.
  def each_gallery(fav_ids)
    @community.galleries.order(:sort).includes(:gallery_images).filter_map do |gallery|
      images = sorted_images(gallery).filter_map { |row| image_json(row, gallery, fav_ids) }
      next if images.empty?

      [gallery, images]
    end
  end

  def summary_json(gallery, images)
    {
      id:       gallery.id,
      title:    gallery.name,
      count:    images.size,
      coverUrl: cover_url(images)
    }
  end

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
      posterUrl:         video ? poster_url(row) : nil,
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
    derived_version_url(row, :thumb) { finalize(version_url(row, :thumb), row) }
  end

  # Poster frame for a video row. Same reasoning as #thumb_url — and the same
  # S3 HEAD if asked of the uploader. GalleryUploader#png_name renames this one
  # to "video_thumbnail_<name>.png", dropping the source extension.
  def poster_url(row)
    derived_version_url(row, :video_thumbnail, as_png: true) do
      finalize(version_url(row, :video_thumbnail), row)
    end
  end

  # A CarrierWave version URL built by string, never by touching `row.image`.
  #
  # Retrieving a mounted uploader walks active_versions, which evaluates every
  # version's :if condition (thumb / ios / large / video_thumbnail), and each
  # of those calls new_file.content_type — on :fog storage an S3 HEAD request.
  # That was one S3 round-trip per row, making the gallery O(photos) in network
  # time: ~320ms each, so a 55-photo property spent 17s building a 671-byte
  # list. Version filenames are deterministic — the version name is prefixed
  # onto the stored file in the same directory — so this is pure string work.
  #
  # Derived from standard_image_url specifically: that column holds the base,
  # unversioned URL. large_image_url is itself "large_<file>", and prefixing
  # that would yield a "thumb_large_<file>" that does not exist.
  #
  # Falls back to the uploader (the given block) only when the column is empty,
  # which is the one case the filename cannot be derived from.
  def derived_version_url(row, version, as_png: false)
    # A row with no stored file has no versions, whatever the URL columns still
    # say. version_url returned nil for these, and so must this.
    return nil if row.read_attribute(:image).blank?

    base = row.standard_image_url.presence
    return yield if base.blank?

    dir, _, file = base.split("?").first.rpartition("/")
    return nil if file.blank?

    file = "#{File.basename(file, File.extname(file))}.png" if as_png
    finalize("#{dir}/#{version}_#{file}", row)
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

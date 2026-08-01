# Serves Google Place photos to the SDK without ever exposing the Google key.
#
# Google hands back a `photo_reference`, not a URL. Turning one into an image
# means calling the Place Photos endpoint with our key, which then 302s to a
# keyless googleusercontent URL. The key obviously cannot go to the browser, so
# requests come back through us:
#
#   1. #register mints a short opaque handle for each reference and remembers
#      the mapping. #path turns a handle into a URL on our own host that the
#      client can drop straight into an <img src>.
#   2. #resolve looks the handle back up, asks Google where the image really
#      lives, and hands the caller that URL to redirect to. We never stream the
#      bytes ourselves.
#
# Why a handle rather than a signed token carrying the reference: Google's
# references run to ~500 characters, and a MessageVerifier token wrapping one
# comes to roughly 2 KB. At two sizes per place and forty places per category
# that is over half a megabyte of payload that is nothing but token. A handle is
# 24 characters, and the reference — which is only usable with our key anyway —
# never leaves the server.
#
# The handle is a truncated digest, so it is stable: the same photo produces the
# same URL every day, and browser caches keep working across the daily refresh.
class SdkNeighborhoodPhotoService
  # Only these can be requested, so the endpoint cannot be driven as a
  # general-purpose image resizer against our Google quota.
  THUMB_WIDTH = 200
  LARGE_WIDTH = 800
  ALLOWED_WIDTHS = [THUMB_WIDTH, LARGE_WIDTH].freeze

  # An hour longer than the places cache that produced these handles, so a
  # handle can never outlive the payload carrying it.
  HANDLE_TTL = 25.hours

  # Google's redirect target is a signed CDN URL. A week is comfortably inside
  # its lifetime while cutting resolution calls to near zero.
  RESOLVED_TTL = 6.days

  PHOTO_ENDPOINT = "https://maps.googleapis.com/maps/api/place/photo".freeze
  TIMEOUT = 5

  # 96 bits of digest. Unguessable, and what it protects is a public photo of a
  # restaurant — the secret here is the API key, which never goes near a client.
  HANDLE_LENGTH = 24

  class << self
    # Remember a batch of references so their handles can be resolved later.
    # One cache round trip for a whole category rather than one per photo.
    #
    # Called only when a category is built, never when one is served from cache:
    # the handles outlive the places payload that carries them by an hour, so a
    # cached payload always has live handles behind it.
    def register(photo_references)
      entries = Array(photo_references).compact_blank.index_by { |ref| handle_key(handle_for(ref)) }
      return if entries.empty?

      Rails.cache.write_multi(entries, expires_in: HANDLE_TTL)
    end

    # Pure — no I/O. Safe to call on the hot path for an already-registered
    # reference.
    def handle_for(photo_reference)
      return nil if photo_reference.blank?

      Digest::SHA256.hexdigest(photo_reference.to_s).first(HANDLE_LENGTH)
    end

    # Path on our own host that renders one photo. Relative on purpose: the SDK
    # prefixes it with the API base it was configured with, so the same cached
    # payload is correct on any environment.
    def path(handle, width)
      return nil if handle.blank?
      return nil unless ALLOWED_WIDTHS.include?(width)

      "/api/partner/maps/neighborhood_photo?p=#{handle}&w=#{width}"
    end

    # Handle -> the real image URL. Returns nil for an unknown or expired
    # handle, an unsupported width, or a Google failure; the caller turns that
    # into a 404 and the host falls back to its own placeholder.
    def resolve(handle, width)
      width = width.to_i
      return nil unless ALLOWED_WIDTHS.include?(width)
      return nil if handle.blank?
      return nil unless handle.to_s.match?(/\A[0-9a-f]{#{HANDLE_LENGTH}}\z/)

      reference = Rails.cache.read(handle_key(handle))
      return nil if reference.blank?

      # skip_nil so a timeout or a Google blip is retried on the next view
      # instead of being remembered as "this photo does not exist" for a week.
      Rails.cache.fetch(resolved_key(handle, width), expires_in: RESOLVED_TTL, skip_nil: true) do
        fetch_location(reference, width)
      end
    end

    private

    def handle_key(handle)
      "sdk:nbhd:pref:#{handle}"
    end

    def resolved_key(handle, width)
      "sdk:nbhd:photo:#{width}:#{handle}"
    end

    # Google answers the photo endpoint with a 302 to the real asset. We want
    # that Location header, not the body — following the redirect here would
    # mean pulling the whole image through this process for nothing.
    def fetch_location(photo_reference, width)
      response = HTTParty.get(
        PHOTO_ENDPOINT,
        query: {
          maxwidth:        width,
          photo_reference: photo_reference,
          key:             ENV["GOOGLE_MAPS_API_KEY"]
        },
        follow_redirects: false,
        timeout:          TIMEOUT
      )

      response.headers["location"].presence
    rescue StandardError => e
      Rails.logger.warn("[SdkNeighborhoodPhoto] resolve failed: #{e.class}: #{e.message}")
      nil
    end
  end
end

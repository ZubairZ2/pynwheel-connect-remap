# app/workers/community_images_worker.rb
require "open-uri"
require "zip"

class CommunityImagesWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'general', retry: 1

  def perform
    base_dir = Rails.root.join("tmp", "images")
    FileUtils.mkdir_p(base_dir)

    communities = Community.where(id: fetch_ids)

    communities.find_each do |community|
      community_dir = base_dir.join(community.name.parameterize)
      FileUtils.mkdir_p(community_dir)

      if community.is_sitemap?
        # Guard against missing sitemap or image
        if community.sitemap&.image&.url.present?
          download_from_url(community.sitemap.image.url, community_dir)
        else
          Rails.logger.warn "Skipping sitemap for community #{community.id} (no image)"
        end
      else
        community.floorplates.each do |floorplate|
          if floorplate&.image&.url.present?
            download_from_url(floorplate.image.url, community_dir)
          else
            Rails.logger.warn "Skipping floorplate for community #{community.id} (no image)"
          end
        end
      end
    end

    # Zip all downloaded files
    zip_path = Rails.root.join("tmp", "community_images.zip")
    File.delete(zip_path) if File.exist?(zip_path)

    Zip::File.open(zip_path, Zip::File::CREATE) do |zipfile|
      Dir[File.join(base_dir, "**", "**")].each do |file|
        zipfile.add(file.sub(base_dir.to_s + "/", ""), file)
      end
    end

    # Upload final zip to S3
    upload_zip_to_s3(zip_path)

    # Cleanup
    FileUtils.rm_rf(base_dir)
    FileUtils.rm_f(zip_path)
  end

  private

  def download_from_url(url, dest_dir)
    filename = File.basename(URI.parse(url).path)
    dest_path = File.join(dest_dir, filename)

    File.open(dest_path, "wb") do |file|
      file.write(URI.open(url).read)
    end
  rescue => e
    Rails.logger.error "Failed to download #{url}: #{e.message}"
  end

  def upload_zip_to_s3(zip_path)
    obj = S3_BUCKET.object("exports/#{File.basename(zip_path)}")
    obj.upload_file(zip_path.to_s, acl: "private")
    Rails.logger.info "Uploaded zip to S3: #{obj.key}"
  end

  def fetch_ids
    [
      1624, 1620, 3758, 867, 1600, 1497, 2333, 2055, 2054, 3450,
      1912, 217, 1607, 1617, 344, 572, 2413, 1634, 3298, 809,
      1322, 1502, 541, 1934, 2002, 3452, 2280, 2209, 3494, 463,
      1015, 1048, 770, 1161, 1760, 1615, 2281, 2412, 1162, 2152,
      1318, 1061, 906, 2051, 1103, 1606, 3756, 3300, 1395, 1837,
      1625, 502, 514, 1619, 2414, 1040, 3301
    ]
  end
end

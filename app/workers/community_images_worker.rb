require "open-uri"
require "zip"

class CommunityImagesWorker
  include Sidekiq::Worker

  def perform
    base_dir = Rails.root.join("tmp", "images")
    FileUtils.mkdir_p(base_dir)

    Community.active_properties.find_each do |community|
      community_dir = base_dir.join(community.name.parameterize)
      FileUtils.mkdir_p(community_dir)

      if community.is_sitemap?
        download_from_url(community.sitemap.image.url, community_dir)
      else
        community.floorplates.each do |floorplate|
          download_from_url(floorplate.image.url, community_dir)
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
end

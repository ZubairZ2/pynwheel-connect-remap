namespace :images do
  desc "Download images from S3 and organize them by community name"
  task download: :environment do
    require 'open-uri'
    require 'fileutils'

    # Define the root directory for images
    images_root_path = Rails.root.join('Images')
    FileUtils.mkdir_p(images_root_path)

    # Find the company and iterate over each community with floorplans
    communities = Community.where(id: [3300, 3298, 3299])
    communities&.where.not(floorplans: []).find_each do |community|
      community_folder_path = images_root_path.join(community.name.parameterize)
      FileUtils.mkdir_p(community_folder_path)

      # Download each floorplan image if the URL is present
      community.floorplans.each do |floorplan|
        image_url = floorplan.image.url
        next if image_url.blank? # Skip if image_url is nil or empty
        image_url = "https://images-pynwheel-cms-v2.s3.amazonaws.com#{image_url}"
        # Validate and parse file name from URL
        begin
          file_name = File.basename(URI.parse(image_url).path)
          file_path = community_folder_path.join(file_name)
        rescue URI::InvalidURIError
          puts "Invalid URL for #{community.name}: #{image_url}"
          next
        end

        # Download the image and save it to the community's folder
        begin
          puts "Attempting to download: #{image_url} for #{community.name}"

          # Open the URL and save the file in binary mode
          URI.open(image_url) do |image_file|
            File.open(file_path, 'wb') do |file|  # 'wb' mode for binary writing
              file.write(image_file.read)
            end
          end
          puts "Downloaded #{file_name} for #{community.name}"
        rescue OpenURI::HTTPError => e
          puts "Failed to download #{file_name} for #{community.name}: HTTP error - #{e.message}"
        rescue Errno::ENOENT => e
          puts "File or directory error for #{community.name} - could not write #{file_name}: #{e.message}"
        rescue => e
          puts "Unexpected error for #{file_name} for #{community.name}: #{e.message}"
        end
      end
    end
    puts "Image download completed."
  end
end

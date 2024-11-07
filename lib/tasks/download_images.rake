namespace :images do
  desc "Download images from S3 and organize them by community name"
  task download: :environment do
    require 'open-uri'
    require 'fileutils'

    # Define the root directory for images on your local machine
    images_root_path = File.expand_path('~/Documents/pynwheel/Images')  # Absolute path to your directory
    FileUtils.mkdir_p(images_root_path)

    # Find the company and iterate over each community with floorplans
    company = Company.find_by(id: 424)
    company&.communities&.where.not(floorplans: []).find_each do |community|
      community_folder_path = images_root_path.join(community.name.parameterize)
      FileUtils.mkdir_p(community_folder_path)

      # Download each floorplan image if the URL is present
      community.floorplans.each do |floorplan|
        image_url = floorplan.image.url
        next if image_url.blank? # Skip if image_url is nil or empty

        file_name = File.basename(URI.parse(image_url).path)
        file_path = community_folder_path.join(file_name)

        # Download the image and save it to the local machine
        begin
          URI.open(image_url) do |image_file|
            # Open file in binary mode to avoid encoding issues
            File.open(file_path, 'wb') do |file|
              file.write(image_file.read)
            end
          end
          puts "Downloaded #{file_name} for #{community.name}"
        rescue URI::InvalidURIError
          puts "Invalid URL for #{community.name}: #{image_url}"
        rescue => e
          puts "Failed to download #{file_name} for #{community.name}: #{e.message}"
        end
      end
    end
    puts "Image download completed."
  end
end

require 'carrierwave/storage/abstract'
require 'carrierwave/storage/file'
require 'carrierwave/storage/fog'

CarrierWave.configure do |config|
  config.fog_credentials = {
    provider:              'AWS',
    aws_access_key_id:    ENV['AWS_ACCESS_KEY_ID'],
    aws_secret_access_key: ENV['AWS_SECRET_ACCESS_KEY'],
    region:                'us-west-2'
  }

  config.max_file_size = 500.megabytes
  config.cache_dir = "#{Rails.root}/public/uploads/tmp"
  config.fog_directory = ENV['S3_BUCKET_NAME']
  config.fog_public     = false
  config.fog_attributes = { 'Cache-Control' => "max-age=#{365.day.to_i}" }
  config.storage = :fog
  config.fog_provider = 'fog/aws'
end

module CarrierWave
  module RMagick
    def quality(percentage)
      manipulate! do |img|
        img.write(current_path) { self.quality = percentage } unless img.quality == percentage
        img = yield(img) if block_given?
        img
      end
    end
  end
end
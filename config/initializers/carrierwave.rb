# require 'carrierwave/storage/abstract'
# require 'carrierwave/storage/file'
# require 'carrierwave/storage/fog'

# CarrierWave.configure do |config|
#   config.fog_credentials = {
#       # Configuration for Amazon S3 should be made available through an Environment variable.
#       # For local installations, export the env variable through the shell OR
#       # if using Passenger, set an Apache environment variable.
#       #
#       # In Heroku, follow http://devcenter.heroku.com/articles/config-vars
#       #
#       # $ heroku config:add S3_KEY=your_s3_access_key S3_SECRET=your_s3_secret S3_REGION=eu-west-1 S3_ASSET_URL=http://assets.example.com/ S3_BUCKET_NAME=s3_bucket/folder

#        # Configuration for Amazon S3
#        :provider              => 'AWS',
#        :aws_access_key_id     => ENV['AWS_ACCESS_KEY_ID'],
#        :aws_secret_access_key => ENV['AWS_SECRET_ACCESS_KEY'],
#        :region => 'us-west-2'
#    }

   
   
#      config.storage = :fog
#      config.fog_provider = 'fog/aws'
   

#    #config.cache_dir = "#{Rails.root}/tmp/uploads"                  # To let CarrierWave work on heroku
#    config.cache_dir = "#{Rails.root}/public/uploads/tmp"

#    config.fog_directory    = ENV['S3_BUCKET_NAME']
#  end

CarrierWave.configure do |config|
  # 1- set "asset_host" in developmet.rb to your localhost url
  # 2- uncommet the line if you want to get localhost images
  # config.asset_host = ActionController::Base.asset_host

  config.max_file_size     = 500.megabytes
  config.fog_provider = 'fog/aws'                         # required
  config.fog_credentials = {
    provider:                'AWS',                         # required
    aws_access_key_id:       ENV['AWS_ACCESS_KEY_ID'],      # required
    aws_secret_access_key:   ENV['AWS_SECRET_ACCESS_KEY'],  # required
    region:                  'us-west-2',                   # optional, defaults to 'us-east-1'
    use_accelerate_endpoint: true
  }
  config.fog_directory  = ENV['S3_BUCKET_NAME'] 
  config.cache_dir = "#{Rails.root}/public/uploads/tmp"
end
module CarrierWave
  module RMagick

    def quality(percentage)
      manipulate! do |img|
        img.write(current_path){ self.quality = percentage } unless img.quality == percentage
        img = yield(img) if block_given?
        img
      end
    end

  end
end
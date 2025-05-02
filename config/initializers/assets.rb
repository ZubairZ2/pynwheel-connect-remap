# Be sure to restart your server when you modify this file.

# Version of your assets, change this if you want to expire all your assets.
Rails.application.config.assets.version = '1.0'
Rails.application.config.assets.precompile += %w( jquery.mCustomScrollbar.css )
Rails.application.config.assets.precompile += %w( slick.css bootstrap-datetimepicker.css )
Rails.application.config.assets.precompile += %w( mapswidget.css )
Rails.application.config.assets.precompile += %w( jquery.arrayUtilities.js )
Rails.application.config.assets.precompile += %w( slick.js bootstrap-datetimepicker.js moment.js)
Rails.application.config.assets.precompile += %w( jsTimezoneDetect.js )
Rails.application.config.assets.precompile += %w( update_session.js )
Rails.application.config.assets.precompile += %w( webpages.js )

# Add additional assets to the asset load path
# Rails.application.config.assets.paths << Emoji.images_path

# Precompile additional assets.
# application.js, application.css, and all non-JS/CSS in app/assets folder are already added.
# Rails.application.config.assets.precompile += %w( search.js )

# Be sure to restart your server when you modify this file.

# Configure sensitive parameters which will be filtered from the log file.
# `token` also masks the Doorkeeper access / refresh tokens in ActiveRecord's
# SQL bind logging (debug level, development and staging): the Tour App API
# looks tokens up on every request and must never log them (October 7, 2026).
# `guest_bluetooth_key` masks the igloohome Bluetooth guest key the Tour App
# API stores on `igloohome_guests` (October 19, 2026): it opens a door.
# `client_secret`, `iglooworks_api_key`, `image` and `csv` mask the lock
# provider credentials and the base64 uploads the Connect Locks page sends
# (October 20, 2026).
# `otp`, `code`, `pin_code`, `phone`, `email`, `guest_pin`, `guest_key`, `id_card`
# and the `*_digest` columns mask the Tour App's visitor sign-in and the
# visitor's contact details (October 23, 2026). `phone` also covers
# `phone_number`, `code` also covers `pin_code` and `country_code`.
# The phone's position (`latitude`/`longitude`/`lat`/`lng`, the fix's
# `accuracy_m`, the `near` query of the property list) is masked too
# (October 28, 2026): a visitor's whereabouts never belong in a log line. The
# coordinate keys are matched whole so that `plate`, `template` and the like
# stay readable.
Rails.application.config.filter_parameters += [:password, :token, :guest_bluetooth_key, :client_secret, :iglooworks_api_key, :image, :csv,
                                               :otp, :code, :phone, :email, :guest_pin, :guest_key, :id_card, :digest, :access_token,
                                               /\Alat(itude)?\z/, /\Al(o)?ng(itude)?\z/, :accuracy_m, :near]

# ActiveRecord copies `filter_parameters` into `filter_attributes` when it
# loads; an earlier initializer of this app loads it before this file runs, so
# the attribute filter is set here as well (runs at once when it is already loaded).
ActiveSupport.on_load(:active_record) do
  self.filter_attributes += [:password, :token, :guest_bluetooth_key, :client_secret, :iglooworks_api_key, :pin_code, :guest_pin, :guest_key, :digest]
end

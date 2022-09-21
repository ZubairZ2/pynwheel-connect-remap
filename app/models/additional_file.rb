class AdditionalFile < ApplicationRecord
  belongs_to :imagepage
  mount_base64_uploader :file, DesignUploader
end

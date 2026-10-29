# frozen_string_literal: true

# The model side of SharedSourceStorage: a record whose `file_source_id` points
# at another record's upload folder reads that folder until it uploads a file
# of its own. At that moment (before_save) the record is detached: every other
# uploaded file it shows is copied from the source folder into its own folder
# (server-side S3 copy, never overwriting, never deleting), then
# `file_source_id` is cleared, so CarrierWave stores the new file under the
# record's own id and the source's objects stay exactly as they were.
module SharedSourceFiles
  extend ActiveSupport::Concern

  included do
    before_save :detach_shared_source_files, if: :shared_source_upload_pending?
  end

  def shared_source_files?
    respond_to?(:file_source_id) && file_source_id.present?
  end

  private

    def shared_source_upload_pending?
      return false unless shared_source_files? && self.class.respond_to?(:uploaders)

      self.class.uploaders.keys.any? { |mount| public_send(mount).cached? }
    end

    def detach_shared_source_files
      source_id = file_source_id
      self.class.uploaders.keys.each do |mount|
        uploader = public_send(mount)
        next if uploader.cached?                       # the new upload: stored under the own folder after save
        next if read_attribute(mount).blank?           # nothing shown for this mount

        src = "uploads/#{self.class.to_s.underscore}/#{mount}/#{source_id}/"
        dst = "uploads/#{self.class.to_s.underscore}/#{mount}/#{id}/"
        SharedSourceFiles.copy_folder(src, dst)
      end
      self.file_source_id = nil
    end

    class << self
      # Copies every object under `src` to `dst` within the application's
      # bucket; existing targets are left as they are. Failures are logged,
      # not raised: a user's upload must not fail because a sibling file could
      # not be copied.
      def copy_folder(src, dst, bucket: default_bucket)
        return 0 if bucket.nil?

        copied = 0
        bucket.objects(prefix: src).each do |object|
          target = object.key.sub(src, dst)
          next if bucket.object(target).exists?

          object.copy_to(bucket: bucket.name, key: target)
          copied += 1
        end
        copied
      rescue StandardError => e
        Rails.logger.warn("[SharedSourceFiles] copy #{src} -> #{dst} failed: #{e.class}: #{e.message}")
        0
      end

      def default_bucket
        defined?(S3_BUCKET) ? S3_BUCKET : nil
      end
    end
end

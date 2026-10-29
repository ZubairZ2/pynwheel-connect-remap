# frozen_string_literal: true

# Shared upload folders (October 29, 2026).
#
# Every uploader stores a record's files under
# `uploads/<model>/<mount>/<record id>/`. A record whose table has a
# `file_source_id` column can point that folder at ANOTHER record's id: the
# property clone sets it to the source record's id, so a cloned unit,
# floorplate, amenity or map reads the very same S3 objects as the original
# instead of a copy (`PropertyClone::Runner`).
#
# Reading is shared; writing never is:
#   - `remove!` deletes an object only when it lies inside this record's OWN
#     id folder. The previous file CarrierWave removes after a re-upload, and
#     the files it removes on destroy, are left alone when they belong to the
#     source record.
#   - `recreate_versions!` (the crop callbacks) is a no-op while the folder is
#     shared, because it would write the versions into the source's folder.
#   - A new upload on a shared record detaches it first
#     (`SharedSourceFiles`, a before_save): its other files are copied into
#     its own folder and `file_source_id` is cleared, so the store goes to the
#     record's own folder.
#
# Prepended to every mounted uploader so its `store_dir` wins.
module SharedSourceStorage
  def store_dir
    "uploads/#{model.class.to_s.underscore}/#{mounted_as}/#{storage_record_id}"
  end

  def own_store_dir
    "uploads/#{model.class.to_s.underscore}/#{mounted_as}/#{model.id}"
  end

  def storage_record_id
    shared_source_id || model.id
  end

  def shared_source_id
    model.respond_to?(:file_source_id) ? model.file_source_id.presence : nil
  end

  def shared_source?
    shared_source_id.present?
  end

  # Only objects inside this record's own folder may be deleted.
  def remove!
    if @file && !owned_path?(@file.path)
      Rails.logger.info("[SharedSourceStorage] #{model.class.name}##{model.id} #{mounted_as}: kept #{@file.path} (not in #{own_store_dir})")
      with_callbacks(:remove) do
        @file = nil
        @cache_id = nil
      end
      return
    end
    super
  end

  def recreate_versions!(*names)
    return if shared_source?

    super
  end

  private

    def owned_path?(path)
      path.to_s.include?("/#{own_store_dir}/") || path.to_s.start_with?("#{own_store_dir}/")
    end
end

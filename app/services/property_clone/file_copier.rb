# frozen_string_literal: true

module PropertyClone
  # Files live on S3 under `uploads/<model>/<mount>/<record id>/...`
  # (every CarrierWave uploader's store_dir keys on the record id), so a row
  # copied with its file-name column alone would point at a folder that does
  # not exist for its new id, while its `*_url` columns would still read the
  # source's objects. This phase gives the clone its own objects: every key
  # under the source prefix is server-side copied to the clone prefix (never
  # overwriting an existing object, never deleting anything), and the `*_url`
  # columns of that row are rewritten to the new prefix only once the copy
  # succeeded. It runs AFTER the database transaction has committed, because
  # S3 cannot take part in it, and every object is accounted for in the
  # manifest. `plan` only lists; `run!` needs an S3 client and a bucket.
  class FileCopier
    Entry = Struct.new(:table, :model, :mount, :source_id, :clone_id, :filename, :source_prefix, :clone_prefix,
                       :status, :objects, :detail, keyword_init: true)

    attr_reader :entries, :bucket

    def self.plan(plan, id_map = nil)
      plan.file_plan.map do |f|
        clone_id = id_map&.get(f[:table], f[:source_id])
        Entry.new(table: f[:table], model: f[:model], mount: f[:mount], source_id: f[:source_id], clone_id: clone_id, filename: f[:filename],
                  source_prefix: f[:source_prefix], clone_prefix: clone_id ? f[:source_prefix].sub(%r{/#{f[:source_id]}/\z}, "/#{clone_id}/") : nil,
                  status: 'PLANNED', objects: [], detail: nil)
      end
    end

    def initialize(entries, bucket:, client:, plan:, logger: nil)
      @entries = entries
      @bucket = bucket
      @client = client
      @plan = plan
      @logger = logger
    end

    def run!
      entries.each do |entry|
        copy_entry(entry)
      rescue StandardError => e
        entry.status = 'FAIL'
        entry.detail = "#{e.class}: #{e.message}"
      end
      self
    end

    def summary
      counts = entries.group_by(&:status).transform_values(&:size)
      { 'bucket' => bucket, 'entries' => entries.size, 'by_status' => counts, 'objects_copied' => entries.sum { |e| e.objects.count { |o| o['copied'] } },
        'details' => entries.map { |e| e.to_h.transform_keys(&:to_s) } }
    end

    private

      def copy_entry(entry)
        raise Error, 'clone id unknown' if entry.clone_id.nil?

        keys = list_keys(entry.source_prefix)
        if keys.empty?
          entry.status = 'MISSING_SOURCE'
          entry.detail = "no object under #{entry.source_prefix}"
          return
        end
        keys.each do |key|
          target = key.sub(entry.source_prefix, entry.clone_prefix)
          if exists?(target)
            entry.objects << { 'key' => key, 'target' => target, 'copied' => false, 'detail' => 'target already exists, left as is' }
            next
          end
          @client.copy_object(bucket: bucket, copy_source: "#{bucket}/#{key}", key: target)
          entry.objects << { 'key' => key, 'target' => target, 'copied' => true }
        end
        rewrite_urls(entry)
        entry.status = 'COPIED'
        @logger&.puts("  #{entry.table}##{entry.source_id} #{entry.mount}: #{entry.objects.size} objects -> #{entry.clone_prefix}")
      end

      def list_keys(prefix)
        keys = []
        token = nil
        loop do
          resp = @client.list_objects_v2(bucket: bucket, prefix: prefix, continuation_token: token)
          keys.concat(Array(resp.contents).map(&:key))
          break unless resp.is_truncated

          token = resp.next_continuation_token
        end
        keys
      end

      def exists?(key)
        @client.head_object(bucket: bucket, key: key)
        true
      rescue Aws::S3::Errors::NotFound, Aws::S3::Errors::NoSuchKey
        false
      end

      def rewrite_urls(entry)
        conn = ActiveRecord::Base.connection
        columns = Policy::URL_COLUMNS & @plan.table_columns(entry.table)
        columns.each do |col|
          conn.execute("UPDATE #{conn.quote_table_name(entry.table)} SET #{conn.quote_column_name(col)} = replace(#{conn.quote_column_name(col)}, #{conn.quote(entry.source_prefix)}, #{conn.quote(entry.clone_prefix)}) " \
                       "WHERE id = #{conn.quote(entry.clone_id)} AND #{conn.quote_column_name(col)} LIKE #{conn.quote("%#{entry.source_prefix}%")}")
        end
      end
  end
end

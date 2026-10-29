# frozen_string_literal: true

module PropertyClone
  # Points every cloned row at the source record's upload folder
  # (`file_source_id`, see SharedSourceStorage). The Runner does this while
  # copying; this service backfills a clone made before shared folders
  # existed, from its manifest's id map. Only rows that carry an uploaded
  # file name are touched; a row that already detached (NULL after its own
  # upload) is left alone unless `force` is set.
  class ShareFiles
    Result = Struct.new(:tables, :rows, keyword_init: true)

    def self.call(id_map, force: false)
      new(id_map, force: force).call
    end

    def initialize(id_map, force: false)
      @id_map = id_map
      @force = force
    end

    def call
      tables = {}
      conn = ActiveRecord::Base.connection
      Policy.steps.each do |step|
        next unless column?(step.table, 'file_source_id')

        mounts = mount_columns(step)
        next if mounts.empty?

        n = 0
        @id_map.source_ids(step.table).each do |source_id|
          clone_id = @id_map.get(step.table, source_id)
          owner = conn.select_value("SELECT COALESCE(file_source_id, id) FROM #{conn.quote_table_name(step.table)} WHERE id = #{conn.quote(source_id)}")
          next if owner.nil?

          present = mounts.map { |m| "#{conn.quote_column_name(m)} IS NOT NULL AND #{conn.quote_column_name(m)} <> ''" }.join(' OR ')
          sql = "UPDATE #{conn.quote_table_name(step.table)} SET file_source_id = #{conn.quote(owner.to_i)} WHERE id = #{conn.quote(clone_id)} AND id <> #{conn.quote(owner.to_i)} AND (#{present})"
          sql += ' AND file_source_id IS NULL' unless @force
          n += conn.update(sql)
        end
        tables[step.table] = n if n.positive?
      end
      Result.new(tables: tables, rows: tables.values.sum)
    end

    private

      def column?(table, name)
        ActiveRecord::Base.connection.columns(table).map(&:name).include?(name)
      end

      def mount_columns(step)
        klass = step.model&.safe_constantize
        return [] unless klass.respond_to?(:uploaders)

        klass.uploaders.keys.map(&:to_s) & ActiveRecord::Base.connection.columns(step.table).map(&:name)
      end
  end
end

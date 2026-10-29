# frozen_string_literal: true

module PropertyClone
  # Executes a resolved Plan inside one database transaction.
  #
  # Every row is copied with `INSERT INTO t (cols) SELECT ... FROM t WHERE id = ?
  # RETURNING id`: the database does the copy, column by column, so values keep
  # their exact types, and no ActiveRecord callback, validation, PaperTrail
  # version, CarrierWave upload or Sidekiq job runs. Remapped foreign keys,
  # sanitized columns and per-row overrides are spliced into the SELECT list as
  # typed literals. Self references and id-bearing serialized columns are
  # rewritten in a second pass once every row has its clone id.
  #
  # The transaction takes `pg_advisory_xact_lock('property_clone', source_id)`
  # first, so two runs for the same property serialize, and re-checks the
  # duplicate-clone condition under that lock.
  class Runner
    SQL_NAME = Plan::SQL_NAME

    attr_reader :plan, :id_map, :step_results, :status_result, :serialized_results, :self_ref_results, :warnings, :started_at, :finished_at, :baseline

    def initialize(plan, options: {}, logger: nil)
      @plan = plan
      @options = options
      @logger = logger
      @id_map = IdMap.new
      @step_results = {}
      @serialized_results = []
      @self_ref_results = []
      @warnings = []
    end

    def clone_property_id
      id_map.get('communities', plan.source.id)
    end

    def clone_company_id
      id_map.get('companies', plan.company.id)
    end

    def execute!
      raise Conflict, plan.conflicts.join('; ') if plan.conflicts.any?

      @started_at = Time.current
      @baseline = Baseline.capture(plan)
      ActiveRecord::Base.transaction(requires_new: true) do
        conn.execute("SELECT pg_advisory_xact_lock(hashtext('property_clone'), #{conn.quote(plan.source.id)})")
        check_duplicate!
        plan.steps.each { |step| copy_step(step) }
        copy_statuses
        second_pass_self_references
        rewrite_serialized_ids
        raise Error, 'PROPERTY_CLONE_FAIL_AT=end (injected failure, transaction rolled back)' if @options[:fail_at] == 'end'
      end
      @finished_at = Time.current
      self
    end

    private

      def conn
        ActiveRecord::Base.connection
      end

      def log(message)
        @logger&.puts(message)
      end

      def q(value)
        conn.quote(value)
      end

      def qc(name)
        conn.quote_column_name(name)
      end

      def qt(name)
        conn.quote_table_name(name)
      end

      def check_duplicate!
        name = plan.clone_company_name
        raise Conflict, "a company named #{name.inspect} already exists (duplicate clone attempt); nothing was written" if Company.where(name: name).exists?
      end

      def lookup
        @lookup ||= ->(table, id) { id_map.get(table, id) }
      end

      # ---- the per-table copy --------------------------------------------

      def copy_step(step)
        refs = plan.rows_for(step.key)
        result = { table: step.table, source_count: refs.size, cloned: 0, skipped: [], cleared: [], sanitized: step.sanitized_columns.keys }
        step_results[step.key] = result
        return if refs.empty?

        columns = plan.table_columns(step.table) - ['id']
        missing = step.sanitized_columns.keys - columns
        @warnings << "#{step.table}: sanitized column(s) #{missing.join(', ')} do not exist in this schema" if missing.any?

        source_rows = load_rows(step.table, refs.map { |r| r['id'] })
        refs.each do |ref|
          src = source_rows[ref['id']]
          decision = plan.resolve_references(step, src, lookup)
          if decision[:action] == :skip
            result[:skipped] << { id: src['id'], reason: decision[:reason] }
            next
          end
          overrides = decision[:overrides]
          result[:cleared].concat(decision[:notes].map { |n| "##{src['id']}: #{n}" })
          step.sanitized_columns.each { |col, value| overrides[col] = value if columns.include?(col) }
          step.self_ref_columns.each { |col| overrides[col] = nil if columns.include?(col) }
          # Shared upload folders: the clone reads the original record's files
          # (or the original's own source, for a clone of a clone).
          overrides[Policy::FILE_SOURCE_COLUMN] = src[Policy::FILE_SOURCE_COLUMN].presence || src['id'] if columns.include?(Policy::FILE_SOURCE_COLUMN)
          overrides.merge!(step.overrides.call(plan.context, src)) if step.overrides
          new_id = insert_copy(step.table, columns, src['id'], overrides)
          id_map.set(step.table, src['id'], new_id)
          result[:cloned] += 1
        end
        log(format('  %-32s %5d -> %5d%s', step.key, refs.size, result[:cloned], result[:skipped].any? ? " (#{result[:skipped].size} skipped)" : ''))
        raise Error, "PROPERTY_CLONE_FAIL_AT=#{step.table} (injected failure, transaction rolled back)" if @options[:fail_at] == step.table
      end

      def load_rows(table, ids)
        rows = {}
        ids.each_slice(500) do |slice|
          conn.select_all("SELECT * FROM #{qt(table)} WHERE id IN (#{slice.join(',')})", SQL_NAME).each { |row| rows[row['id']] = row }
        end
        rows
      end

      def insert_copy(table, columns, source_id, overrides)
        select_list = columns.map { |c| overrides.key?(c) ? literal(plan.column(table, c), overrides[c]) : qc(c) }
        sql = "INSERT INTO #{qt(table)} (#{columns.map { |c| qc(c) }.join(', ')}) " \
              "SELECT #{select_list.join(', ')} FROM #{qt(table)} WHERE id = #{q(source_id)} RETURNING id"
        conn.select_value(sql, SQL_NAME).to_i
      end

      # A typed SQL literal for an override value, cast to the column's type so
      # arrays, json and enums land exactly as the column expects.
      def literal(column, value)
        base = column.sql_type.to_s.sub(/\[\]\z/, '')
        array = column.respond_to?(:array?) ? column.array? : column.try(:array)
        cast = "#{base}#{array ? '[]' : ''}"
        return "NULL::#{cast}" if value.nil?

        quoted = case value
                 when Array
                   array ? q(conn.lookup_cast_type_from_column(column).serialize(value)) : q(JSON.generate(value))
                 when Hash then q(JSON.generate(value))
                 else q(value)
                 end
        "#{quoted}::#{cast}"
      end

      # ---- statuses (polymorphic launch-form statuses) ---------------------

      def copy_statuses
        rows = plan.status_rows
        @status_result = { table: 'statuses', source_count: rows.size, cloned: 0, skipped: [] }
        return if rows.empty?

        columns = plan.table_columns('statuses') - ['id']
        rows.each do |row|
          table = Plan.table_for_type(row['statusable_type'])
          new_id = table && id_map.get(table, row['statusable_id'])
          if new_id.nil?
            @status_result[:skipped] << { id: row['id'], reason: "#{row['statusable_type']}##{row['statusable_id']} was not cloned" }
            next
          end
          clone = insert_copy('statuses', columns, row['id'], { 'statusable_id' => new_id })
          id_map.set('statuses', row['id'], clone)
          @status_result[:cloned] += 1
        end
        log(format('  %-32s %5d -> %5d', 'statuses', rows.size, @status_result[:cloned]))
      end

      # ---- second pass: self references ----------------------------------

      def second_pass_self_references
        plan.steps.each do |step|
          next if step.self_ref_columns.empty?

          cols = step.self_ref_columns & plan.table_columns(step.table)
          next if cols.empty?

          plan.rows_for(step.key).each do |ref|
            new_id = id_map.get(step.table, ref['id'])
            next unless new_id

            cols.each do |col|
              value = ref[col]
              next if value.nil?

              target = id_map.get(step.table, value)
              if target
                conn.execute("UPDATE #{qt(step.table)} SET #{qc(col)} = #{q(target)} WHERE id = #{q(new_id)}")
                @self_ref_results << { table: step.table, clone_id: new_id, column: col, source_value: value, clone_value: target }
              else
                @self_ref_results << { table: step.table, clone_id: new_id, column: col, source_value: value, clone_value: nil }
              end
            end
          end
        end
      end

      # ---- second pass: id-bearing serialized columns ---------------------

      def rewrite_serialized_ids
        Policy::SERIALIZED_ID_COLUMNS.each do |table, column, kind, target|
          next unless plan.table_columns(table).include?(column)

          klass = Plan.model_name_for(table).constantize
          id_map.source_ids(table).each do |source_id|
            clone_id = id_map.get(table, source_id)
            value = klass.where(id: source_id).pick(column.to_sym)
            next if value.blank?

            rewritten, dropped = remap_serialized(value, kind, target)
            next if rewritten == value && dropped.empty?

            conn.execute("UPDATE #{qt(table)} SET #{qc(column)} = #{literal(plan.column(table, column), rewritten)} WHERE id = #{q(clone_id)}")
            @serialized_results << { table: table, column: column, clone_id: clone_id, remapped: count_ids(rewritten, kind), dropped: dropped }
          end
        end
      end

      def remap_serialized(value, kind, target)
        dropped = []
        case kind
        when 'int_array'
          mapped = Array(value).filter_map { |v| id_map.get(target, v) || (dropped << v.to_i; nil) }
          [mapped, dropped]
        when 'text_array'
          mapped = Array(value).filter_map { |v| (m = id_map.get(target, v.to_i)) ? m.to_s : (dropped << v; nil) }
          [mapped, dropped]
        when 'json_hash_of_id_lists'
          hash = value.is_a?(String) ? (JSON.parse(value) rescue {}) : value
          hash = {} unless hash.is_a?(Hash)
          mapped = hash.transform_values do |list|
            Array(list).filter_map { |v| (m = id_map.get(target, v.to_i)) ? m.to_s : (dropped << v; nil) }
          end
          [mapped, dropped]
        else
          [value, dropped]
        end
      end

      def count_ids(value, kind)
        kind == 'json_hash_of_id_lists' ? value.values.sum(&:size) : value.size
      end
  end
end

# frozen_string_literal: true

module PropertyClone
  # What the row-level overrides see.
  class Context
    attr_reader :source, :suffix, :options

    def initialize(source, suffix:, options: {})
      @source = source
      @suffix = suffix
      @options = options
    end

    def suffixed(name)
      name = name.to_s
      name.end_with?(suffix) ? name : "#{name}#{suffix}"
    end
  end

  # Resolves the Policy against one source property without writing anything:
  # which source rows each step would copy, which of them would be skipped or
  # have a reference cleared, the files that would have to be copied, the
  # records explicitly excluded, and the conflicts that would stop a run.
  # This IS the dry run; the Runner executes a resolved plan.
  class Plan
    SQL_NAME = 'PropertyClone'

    attr_reader :source_id, :suffix, :options, :source, :company, :context,
                :source_ids, :rows, :dispositions, :exclusions, :conflicts, :notes, :file_plan, :status_rows

    def initialize(source_id, suffix: Policy::SUFFIX, options: {})
      @source_id = source_id.to_i
      @suffix = suffix
      @options = options
      @source_ids = Hash.new { |h, k| h[k] = [] }
      @source_id_sets = Hash.new { |h, k| h[k] = Set.new }
      @rows = {}
      @dispositions = {}
      @exclusions = []
      @conflicts = []
      @notes = []
      @file_plan = []
      @status_rows = []
    end

    def steps
      Policy.steps
    end

    def resolve!
      raise NotFound, "no property with id #{source_id}" if source_id.zero?

      @source = Community.find_by(id: source_id)
      raise NotFound, "no property with id #{source_id}" unless @source

      @company = Company.find_by(id: @source.company_id)
      raise NotFound, "property #{source_id} has no company (company_id=#{@source.company_id.inspect})" unless @company

      @context = Context.new(@source, suffix: suffix, options: options)
      steps.each { |step| resolve_step(step) }
      resolve_statuses
      resolve_files
      resolve_exclusions
      detect_conflicts
      collect_notes
      self
    end

    # ---- what the Runner and the reports read --------------------------------

    def clone_company_name
      context.suffixed(company.name)
    end

    def clone_property_name
      context.suffixed(source.name)
    end

    def rows_for(step_key)
      rows[step_key] || []
    end

    def source_ids_for(table)
      source_ids[table]
    end

    def source_has?(table, id)
      @source_id_sets[table].include?(id)
    end

    def expected_count(step_key)
      rows_for(step_key).count { |row| dispositions[step_key][row['id']][:action] == :copy }
    end

    def skipped(step_key)
      rows_for(step_key).select { |row| dispositions[step_key][row['id']][:action] == :skip }
                        .map { |row| { id: row['id'], reason: dispositions[step_key][row['id']][:reason] } }
    end

    def cleared_references(step_key)
      rows_for(step_key).flat_map { |row| dispositions[step_key][row['id']][:notes] || [] }
    end

    def sibling_ids
      @sibling_ids ||= Community.where(company_id: company.id).where.not(id: source.id).order(:id).pluck(:id)
    end

    def source_tour_ids
      source_ids['tours']
    end

    def summary_rows
      steps.map do |step|
        { key: step.key, table: step.table, category: step.category, source_count: rows_for(step.key).size,
          expected: expected_count(step.key), skipped: skipped(step.key).size, cleared: cleared_references(step.key).size,
          sanitized: step.sanitized_columns.keys, note: step.note }
      end + [{ key: 'statuses', table: 'statuses', category: :clone_remap, source_count: status_rows.size,
               expected: status_rows.size, skipped: 0, cleared: 0, sanitized: [], note: Policy::STATUSES.note }]
    end

    def total_expected
      summary_rows.sum { |r| r[:expected] }
    end

    def table_columns(table)
      @table_columns ||= {}
      @table_columns[table] ||= conn.columns(table).map(&:name)
    end

    def column(table, name)
      @column_meta ||= {}
      @column_meta[table] ||= conn.columns(table).index_by(&:name)
      @column_meta[table][name]
    end

    # The one place a polymorphic *_type value becomes a table name. Legacy
    # stop types are lower-case ("unit"), the newer ones CamelCase ("Floorplate").
    def self.table_for_type(type)
      klass = type.to_s.classify.safe_constantize
      return nil unless klass.is_a?(Class) && klass < ActiveRecord::Base

      klass.table_name
    rescue NameError
      nil
    end

    def self.model_name_for(table)
      table.to_s.classify
    end

    # Shared by Plan (prediction) and Runner (execution): the remapped values
    # of one row, or the decision to skip it. `lookup.call(table, id)` answers
    # the clone id (Runner) or the id itself when it is part of the source
    # footprint (Plan).
    def resolve_references(step, row, lookup)
      overrides = {}
      notes = []
      step.remap_columns.each do |col, target|
        value = row[col]
        next if value.nil?

        mapped = lookup.call(target, value)
        if mapped
          overrides[col] = mapped
          next
        end
        policy = Array(step.required).include?(col) ? :fail : step.missing_policy(col, :null)
        case policy
        when :fail then raise MissingReference, "#{step.key}##{row['id']}: #{col}=#{value} has no clone in #{target}"
        when :skip then return { action: :skip, reason: "#{col}=#{value} is not part of the clone" }
        else
          overrides[col] = nil
          notes << "#{col}=#{value} cleared (not part of the clone)"
        end
      end
      step.poly_pairs.each do |type_col, id_col|
        type = row[type_col]
        value = row[id_col]
        next if value.nil? || type.blank?

        target = self.class.table_for_type(type)
        mapped = target && lookup.call(target, value)
        if mapped
          overrides[id_col] = mapped
          next
        end
        case step.missing_policy(id_col, :skip)
        when :fail then raise MissingReference, "#{step.key}##{row['id']}: #{type_col}=#{type} #{id_col}=#{value} has no clone"
        when :skip then return { action: :skip, reason: "#{type_col}=#{type} #{id_col}=#{value} is not part of the clone" }
        else
          overrides[id_col] = nil
          notes << "#{type_col}=#{type} #{id_col}=#{value} cleared (not part of the clone)"
        end
      end
      { action: :copy, overrides: overrides, notes: notes }
    end

    def selection_sql(step)
      sel = step.select
      if sel[:id]
        id = case sel[:id]
             when :source then source.id
             when :company then source.company_id
             when :region then source.region_id
             when :group then source.community_group_id
             end
        return nil if id.nil?

        "#{qc('id')} = #{q(id)}"
      elsif sel[:column]
        value = sel[:value] == :company ? source.company_id : source.id
        sql = "#{qc(sel[:column])} = #{q(value)}"
        sql += " AND (#{sel[:where]})" if sel[:where]
        sql
      elsif sel[:parent]
        ids = source_ids[sel[:table]]
        return nil if ids.empty?

        "#{qc(sel[:parent])} IN (#{ids.join(',')})"
      elsif sel[:poly]
        type_col, id_col = sel[:poly]
        parts = sel[:tables].filter_map do |table|
          ids = source_ids[table]
          next if ids.empty?

          "(#{qc(type_col)} = #{q(self.class.model_name_for(table))} AND #{qc(id_col)} IN (#{ids.join(',')}))"
        end
        parts.empty? ? nil : parts.join(' OR ')
      end
    end

    def exclusion_scope_sql(scope)
      scope.gsub(':source', q(source.id))
           .gsub(':company', q(source.company_id))
           .gsub(':tours', source_tour_ids.empty? ? 'NULL' : source_tour_ids.join(','))
    end

    private

      def conn
        ActiveRecord::Base.connection
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

      def resolve_step(step)
        cols = (['id'] + step.remap_columns.keys + step.poly_pairs.flatten + step.self_ref_columns).uniq & table_columns(step.table)
        where = selection_sql(step)
        found = where ? conn.select_all("SELECT #{cols.map { |c| qc(c) }.join(', ')} FROM #{qt(step.table)} WHERE #{where} ORDER BY id", SQL_NAME).to_a : []
        rows[step.key] = found
        found.each do |row|
          source_ids[step.table] << row['id']
          @source_id_sets[step.table] << row['id']
        end
        lookup = ->(table, id) { source_has?(table, id) ? id : nil }
        dispositions[step.key] = found.to_h { |row| [row['id'], resolve_references(step, row, lookup)] }
      end

      def resolve_statuses
        parts = steps.filter_map do |step|
          ids = source_ids[step.table]
          next if ids.empty? || step.model.blank?

          "(#{qc('statusable_type')} = #{q(step.model)} AND #{qc('statusable_id')} IN (#{ids.uniq.join(',')}))"
        end.uniq
        return if parts.empty?

        @status_rows = conn.select_all("SELECT id, statusable_type, statusable_id FROM statuses WHERE #{parts.join(' OR ')} ORDER BY id", SQL_NAME).to_a
      end

      def resolve_files
        steps.each do |step|
          next if step.model.blank?

          klass = step.model.safe_constantize
          next unless klass.respond_to?(:uploaders) && klass.uploaders.any?

          mounts = klass.uploaders.keys.map(&:to_s) & table_columns(step.table)
          ids = rows_for(step.key).map { |r| r['id'] }
          next if mounts.empty? || ids.empty?

          conn.select_all("SELECT id, #{mounts.map { |m| qc(m) }.join(', ')} FROM #{qt(step.table)} WHERE id IN (#{ids.join(',')}) ORDER BY id", SQL_NAME).each do |row|
            mounts.each do |mount|
              next if row[mount].blank?

              @file_plan << { table: step.table, model: klass.name, mount: mount, source_id: row['id'], filename: row[mount],
                              source_prefix: "uploads/#{klass.name.underscore}/#{mount}/#{row['id']}/" }
            end
          end
        end
      end

      def resolve_exclusions
        @exclusions = Policy.exclusions.map do |ex|
          count = nil
          if ex.scope.present? && !ex.table.include?('/')
            table = ex.table.split(' ').first
            count = conn.select_value("SELECT count(*) FROM #{qt(table)} WHERE #{exclusion_scope_sql(ex.scope)}", SQL_NAME).to_i
          end
          { table: ex.table, category: ex.category, source_count: count, reason: ex.reason }
        end
      end

      def detect_conflicts
        if Company.where(name: clone_company_name).exists?
          @conflicts << "a company named #{clone_company_name.inspect} already exists: a previous clone of this company? Remove it or run with a different CLONE_SUFFIX"
        end
        if source.region_id && Region.where(name: context.suffixed(Region.where(id: source.region_id).pick(:name).to_s)).exists?
          @conflicts << 'the suffixed region name already exists (Region#name is unique application-wide)'
        end
        if source.community_group_id && CommunityGroup.where(name: context.suffixed(CommunityGroup.where(id: source.community_group_id).pick(:name).to_s)).exists?
          @conflicts << 'the suffixed group name already exists (CommunityGroup#name is unique application-wide)'
        end
        @conflicts << "the source property is itself a clone (its name ends with #{suffix.inspect})" if source.name.to_s.end_with?(suffix)
      end

      def collect_notes
        tours = source_ids['tours'].size
        @notes << 'the property has no tour (tours.tour_user_id IS NULL): the clone will have none either' if tours.zero?
        @notes << "the property has #{tours} tours with tour_user_id IS NULL; all of them are cloned (community_tour picks the last)" if tours > 1
        null_hallways = rows_for('hallways').size.zero? ? 0 : conn.select_value("SELECT count(*) FROM hallways WHERE id IN (#{source_ids['hallways'].join(',')}) AND community_id IS NULL", SQL_NAME).to_i
        @notes << "#{null_hallways} hallway rows have NULL community_id on the source (legacy point_save); they are cloned as they are" if null_hallways.positive?
        rows_for('tour_stops').map { |r| r['stop_type'] }.uniq.each do |type|
          @notes << "tour_stops.stop_type #{type.inspect} is not a known model; those stops are skipped" if self.class.table_for_type(type).nil?
        end
        @notes << "#{sibling_ids.size} sibling properties stay with the source company (ids #{sibling_ids.first(20).join(', ')}#{sibling_ids.size > 20 ? ', ...' : ''})"
      end
  end
end

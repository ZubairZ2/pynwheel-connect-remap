# frozen_string_literal: true

module PropertyClone
  # Integrity checks on a finished clone. Every check answers PASS / FAIL /
  # NOT RUN with a detail string; nothing here writes.
  class Verifier
    Check = Struct.new(:name, :status, :detail, keyword_init: true)

    attr_reader :checks

    def initialize(plan, id_map, baseline: nil, expected_counts: nil)
      @plan = plan
      @id_map = id_map
      @baseline = baseline
      @expected_counts = expected_counts
      @checks = []
    end

    def clone_property_id
      @id_map.get('communities', @plan.source.id)
    end

    def clone_company_id
      @id_map.get('companies', @plan.company.id)
    end

    def run
      check('1 distinct ids') { distinct_ids }
      check('2 clone belongs to clone company') { belongs_to_clone_company }
      check('3 only the selected property under the clone company') { only_selected_property }
      check('4 sibling properties untouched') { siblings_untouched }
      check('5 record counts match the plan') { counts_match }
      check('5b configuration values match the source') { values_match }
      check('6 foreign keys point at cloned records') { fk_validity }
      check('7 maps, stops, units, amenities, paths connected') { connectivity }
      check('8 no reference to a source record') { no_source_references }
      check('8b serialized id columns remapped') { serialized_ids }
      check('9 clone has no row the source could share') { no_shared_rows }
      check('10 sensitive columns and integrations policy') { sensitive_policy }
      check('11 source company and property unchanged') { source_unchanged }
      self
    end

    def passed?
      checks.none? { |c| c.status == 'FAIL' }
    end

    def to_a
      checks.map(&:to_h)
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

      def check(name)
        status, detail = yield
        @checks << Check.new(name: name, status: status, detail: detail)
      rescue StandardError => e
        @checks << Check.new(name: name, status: 'FAIL', detail: "#{e.class}: #{e.message}")
      end

      def pass(detail = 'ok')
        ['PASS', detail]
      end

      def fail(detail)
        ['FAIL', detail]
      end

      def verdict(problems, ok_detail)
        problems.empty? ? pass(ok_detail) : fail(problems.join('; '))
      end

      # ---- 1-4 ------------------------------------------------------------

      def distinct_ids
        problems = []
        problems << 'clone property id missing' if clone_property_id.nil?
        problems << 'clone company id missing' if clone_company_id.nil?
        problems << 'clone property id equals the source' if clone_property_id == @plan.source.id
        problems << 'clone company id equals the source company' if clone_company_id == @plan.company.id
        verdict(problems, "property #{@plan.source.id} -> #{clone_property_id}, company #{@plan.company.id} -> #{clone_company_id}")
      end

      def belongs_to_clone_company
        company_id = conn.select_value("SELECT company_id FROM communities WHERE id = #{q(clone_property_id)}").to_i
        company_id == clone_company_id ? pass("communities.company_id = #{company_id}") : fail("clone property's company_id is #{company_id}, expected #{clone_company_id}")
      end

      def only_selected_property
        ids = conn.select_values("SELECT id FROM communities WHERE company_id = #{q(clone_company_id)} ORDER BY id").map(&:to_i)
        ids == [clone_property_id] ? pass('the clone company owns exactly the cloned property') : fail("clone company owns communities #{ids.inspect}")
      end

      def siblings_untouched
        problems = []
        @plan.sibling_ids.each do |sid|
          company_id = conn.select_value("SELECT company_id FROM communities WHERE id = #{q(sid)}")
          problems << "sibling #{sid} now has company_id #{company_id.inspect}" unless company_id.to_i == @plan.company.id
        end
        count = conn.select_value("SELECT count(*) FROM communities WHERE company_id = #{q(@plan.company.id)}").to_i
        expected = @plan.sibling_ids.size + 1
        problems << "source company now has #{count} properties, expected #{expected}" unless count == expected
        verdict(problems, "#{@plan.sibling_ids.size} siblings still belong to company #{@plan.company.id}, none duplicated")
      end

      # ---- 5 --------------------------------------------------------------

      def counts_match
        problems = []
        @plan.steps.each do |step|
          expected = @expected_counts ? @expected_counts[step.key] : @plan.expected_count(step.key)
          actual = @id_map.count(step.table) if step.table != 'credentials'
          actual = credentials_count(step) if step.table == 'credentials'
          problems << "#{step.key}: #{actual} cloned, #{expected} expected" unless actual == expected
        end
        verdict(problems, "#{@plan.steps.size} steps, #{@id_map.tables.sum { |t| @id_map.count(t) }} rows mapped")
      end

      def credentials_count(step)
        @plan.rows_for(step.key).count { |r| @id_map.get('credentials', r['id']) }
      end

      # Columns neither remapped, sanitized nor overridden must be identical,
      # row for row (clone ids were assigned in source id order).
      def values_match
        problems = []
        @plan.steps.each do |step|
          pairs = @plan.rows_for(step.key).filter_map { |r| (c = @id_map.get(step.table, r['id'])) && [r['id'], c] }
          next if pairs.empty?

          skip = ['id', 'created_at', 'updated_at'] + step.remap_columns.keys + step.poly_pairs.flatten + step.self_ref_columns + step.sanitized_columns.keys + override_columns(step) + serialized_columns(step.table)
          cols = @plan.table_columns(step.table) - skip
          next if cols.empty?

          src = digest(step.table, cols, pairs.map(&:first))
          dst = digest(step.table, cols, pairs.map(&:last))
          problems << "#{step.key}: #{cols.size} columns differ between source and clone" unless src == dst
        end
        verdict(problems, 'every non-remapped, non-sanitized column is identical on source and clone')
      end

      # Rewritten after the pass and checked by 8b, so they differ by design.
      def serialized_columns(table)
        Policy::SERIALIZED_ID_COLUMNS.select { |t, _c, _k, _target| t == table }.map { |_t, c, _k, _target| c }
      end

      def override_columns(step)
        return [] unless step.overrides

        case step.table
        when 'companies', 'regions', 'community_groups', 'communities' then %w[name]
        when 'hallway_detection_runs' then %w[client_request_id]
        else []
        end
      end

      def digest(table, cols, ids)
        conn.select_value("SELECT md5(string_agg(row(#{cols.map { |c| qc(c) }.join(', ')})::text, '|' ORDER BY id)) FROM #{qt(table)} WHERE id IN (#{ids.join(',')})")
      end

      # ---- 6-9 ------------------------------------------------------------

      def fk_validity
        problems = []
        each_reference do |step, column, target, clone_ids|
          targets = @id_map.clone_ids(target)
          bad = if targets.empty?
                  conn.select_value("SELECT count(*) FROM #{qt(step.table)} WHERE id IN (#{clone_ids.join(',')}) AND #{qc(column)} IS NOT NULL").to_i
                else
                  conn.select_value("SELECT count(*) FROM #{qt(step.table)} WHERE id IN (#{clone_ids.join(',')}) AND #{qc(column)} IS NOT NULL AND #{qc(column)} NOT IN (#{targets.join(',')})").to_i
                end
          problems << "#{step.key}.#{column}: #{bad} rows point outside the cloned #{target}" if bad.positive?
        end
        each_poly_reference do |step, type_col, id_col, type, target, clone_ids|
          targets = @id_map.clone_ids(target)
          cond = targets.empty? ? '' : " AND #{qc(id_col)} NOT IN (#{targets.join(',')})"
          bad = conn.select_value("SELECT count(*) FROM #{qt(step.table)} WHERE id IN (#{clone_ids.join(',')}) AND #{qc(type_col)} = #{q(type)} AND #{qc(id_col)} IS NOT NULL#{cond}").to_i
          problems << "#{step.key}.#{id_col} (#{type}): #{bad} rows point outside the cloned #{target}" if bad.positive?
        end
        verdict(problems, 'every non-NULL remapped foreign key and polymorphic pair resolves to a cloned row')
      end

      def no_source_references
        problems = []
        each_reference do |step, column, target, clone_ids|
          sources = @id_map.source_ids(target)
          next if sources.empty?

          bad = conn.select_value("SELECT count(*) FROM #{qt(step.table)} WHERE id IN (#{clone_ids.join(',')}) AND #{qc(column)} IN (#{sources.join(',')})").to_i
          problems << "#{step.key}.#{column}: #{bad} rows still point at source #{target}" if bad.positive?
        end
        each_poly_reference do |step, type_col, id_col, type, target, clone_ids|
          sources = @id_map.source_ids(target)
          next if sources.empty?

          bad = conn.select_value("SELECT count(*) FROM #{qt(step.table)} WHERE id IN (#{clone_ids.join(',')}) AND #{qc(type_col)} = #{q(type)} AND #{qc(id_col)} IN (#{sources.join(',')})").to_i
          problems << "#{step.key}.#{id_col} (#{type}): #{bad} rows still point at source #{target}" if bad.positive?
        end
        verdict(problems, 'no cloned row references a source record through a remapped column')
      end

      def each_reference
        @plan.steps.each do |step|
          clone_ids = @id_map.clone_ids(step.table)
          next if clone_ids.empty?

          step.remap_columns.each { |column, target| yield step, column, target, clone_ids }
          step.self_ref_columns.each { |column| yield step, column, step.table, clone_ids }
        end
      end

      def each_poly_reference
        @plan.steps.each do |step|
          clone_ids = @id_map.clone_ids(step.table)
          next if clone_ids.empty?

          step.poly_pairs.each do |type_col, id_col|
            types = conn.select_values("SELECT DISTINCT #{qc(type_col)} FROM #{qt(step.table)} WHERE id IN (#{clone_ids.join(',')}) AND #{qc(type_col)} IS NOT NULL")
            types.each do |type|
              target = Plan.table_for_type(type)
              yield step, type_col, id_col, type, target || type, clone_ids
            end
          end
        end
      end

      def connectivity
        problems = []
        cp = clone_property_id
        %w[units amenities elevators building_starting_points doors wayfinding_stops floorplates floorplans sitemaps galleries webpages imagepages].each do |table|
          ids = @id_map.clone_ids(table)
          next if ids.empty?

          off = conn.select_value("SELECT count(*) FROM #{qt(table)} WHERE id IN (#{ids.join(',')}) AND community_id <> #{q(cp)}").to_i
          problems << "#{table}: #{off} cloned rows do not belong to the clone property" if off.positive?
        end
        stops = @id_map.clone_ids('tour_stops')
        if stops.any?
          conn.select_all("SELECT id, stop_type, stop_id FROM tour_stops WHERE id IN (#{stops.join(',')})").each do |row|
            table = Plan.table_for_type(row['stop_type'])
            next unless table && @plan.table_columns(table).include?('community_id')

            owner = conn.select_value("SELECT community_id FROM #{qt(table)} WHERE id = #{q(row['stop_id'])}")
            problems << "tour_stop #{row['id']} -> #{row['stop_type']}##{row['stop_id']} belongs to community #{owner.inspect}" unless owner.to_i == cp
          end
        end
        units = @id_map.clone_ids('units')
        if units.any?
          plates = @id_map.clone_ids('floorplates')
          cond = plates.empty? ? 'floorplate_id IS NOT NULL' : "floorplate_id IS NOT NULL AND floorplate_id NOT IN (#{plates.join(',')})"
          bad = conn.select_value("SELECT count(*) FROM units WHERE id IN (#{units.join(',')}) AND #{cond}").to_i
          problems << "units: #{bad} rows sit on a floorplate that is not cloned" if bad.positive?
        end
        tours = @id_map.clone_ids('tours')
        problems << 'tours: a cloned tour does not belong to the clone property' if tours.any? && conn.select_value("SELECT count(*) FROM tours WHERE id IN (#{tours.join(',')}) AND community_id <> #{q(cp)}").to_i.positive?
        verdict(problems, "#{stops.size} stops, #{units.size} units, #{@id_map.count('hallways')} hallways, #{@id_map.count('paths')} paths all attached to property #{cp}")
      end

      def serialized_ids
        problems = []
        Policy::SERIALIZED_ID_COLUMNS.each do |table, column, kind, target|
          next unless @plan.table_columns(table).include?(column)

          allowed = @id_map.clone_ids(target).to_set
          klass = Plan.model_name_for(table).constantize
          @id_map.clone_ids(table).each do |clone_id|
            value = klass.where(id: clone_id).pick(column.to_sym)
            next if value.blank?

            ids = case kind
                  when 'json_hash_of_id_lists' then (value.is_a?(Hash) ? value.values.flatten : [])
                  else Array(value)
                  end.map(&:to_i)
            foreign = ids.reject { |i| allowed.include?(i) }
            problems << "#{table}##{clone_id}.#{column}: #{foreign.size} ids are not cloned #{target} (#{foreign.first(5).inspect})" if foreign.any?
          end
        end
        verdict(problems, 'deleted_ids, next_points, favourites and sort_hash only name cloned rows')
      end

      def no_shared_rows
        problems = []
        @id_map.tables.each do |table|
          overlap = @id_map.clone_ids(table) & @id_map.source_ids(table)
          problems << "#{table}: #{overlap.size} ids are both source and clone" if overlap.any?
        end
        verdict(problems, 'every cloned row has a primary key the source footprint does not use')
      end

      # ---- 10 -------------------------------------------------------------

      def sensitive_policy
        problems = []
        cp = clone_property_id
        cc = clone_company_id
        @plan.steps.each do |step|
          next if step.sanitized_columns.empty?

          ids = @id_map.clone_ids(step.table)
          next if ids.empty?

          step.sanitized_columns.each do |col, value|
            next unless @plan.table_columns(step.table).include?(col)

            cond = case value
                   when nil then "#{qc(col)} IS NOT NULL"
                   when false then "#{qc(col)} IS DISTINCT FROM FALSE"
                   when Array then "COALESCE(array_length(#{qc(col)}, 1), 0) <> 0"
                   when Hash then "#{qc(col)}::text <> '{}'"
                   else "#{qc(col)} IS DISTINCT FROM #{q(value)}"
                   end
            bad = conn.select_value("SELECT count(*) FROM #{qt(step.table)} WHERE id IN (#{ids.join(',')}) AND #{cond}").to_i
            problems << "#{step.key}.#{col}: #{bad} rows not sanitized" if bad.positive?
          end
        end
        Policy::CLONE_MUST_BE_EMPTY.each do |table|
          next unless @plan.table_columns(table).include?('community_id')

          n = conn.select_value("SELECT count(*) FROM #{qt(table)} WHERE community_id = #{q(cp)}").to_i
          problems << "#{table}: #{n} rows attached to the clone" if n.positive?
        end
        n = conn.select_value("SELECT count(*) FROM tours WHERE community_id = #{q(cp)} AND tour_user_id IS NOT NULL").to_i
        problems << "tours: #{n} visitor tours attached to the clone" if n.positive?
        n = conn.select_value("SELECT count(*) FROM users WHERE company_id = #{q(cc)}").to_i
        problems << "users: #{n} users attached to the clone company (expected none before the test admin is bootstrapped)" if n.positive? && !@plan.options[:allow_clone_users]
        verdict(problems, 'sanitized columns are cleared; no booking, visitor, lock-account, partner-key or user rows hang off the clone')
      end

      # ---- 11 -------------------------------------------------------------

      def source_unchanged
        return ['NOT RUN', 'no baseline captured'] unless @baseline

        after = Baseline.capture(@plan)
        diffs = @baseline.compare(after)
        diffs.empty? ? pass("#{@baseline.digests.size} digests identical before and after") : fail(diffs.map { |n, b, a| "#{n}: #{b.inspect} -> #{a.inspect}" }.join('; '))
      end
  end
end

# frozen_string_literal: true

module PropertyClone
  # Read-only fingerprint of everything the clone must leave untouched: the
  # source property's footprint (every row each step selects), its company,
  # the sibling properties, the company's users and their assignments, and
  # the counts of the excluded tables. A digest is `md5(string_agg(row::text
  # ORDER BY id))`, so any changed column of any row shows up. Captured
  # before the run and compared afterwards (and again after the isolation
  # rehearsal, see property_clone:compare_baseline).
  class Baseline
    attr_reader :digests, :captured_at

    def self.capture(plan)
      new(plan).capture
    end

    def self.from_h(hash)
      baseline = allocate
      baseline.instance_variable_set(:@digests, hash['digests'] || hash[:digests] || {})
      baseline.instance_variable_set(:@captured_at, hash['captured_at'] || hash[:captured_at])
      baseline
    end

    def initialize(plan)
      @plan = plan
      @digests = {}
    end

    def capture
      @captured_at = Time.current.iso8601
      @plan.steps.each do |step|
        ids = @plan.rows_for(step.key).map { |r| r['id'] }
        @digests[step.key] = digest(step.table, ids)
      end
      @digests['statuses'] = digest('statuses', @plan.status_rows.map { |r| r['id'] })
      @digests['companies (row)'] = digest('companies', [@plan.company.id])
      @digests['communities (source row)'] = digest('communities', [@plan.source.id])
      @digests['communities (siblings)'] = digest('communities', @plan.sibling_ids)
      @digests['users (company)'] = digest_where('users', "company_id = #{q(@plan.company.id)}")
      @digests['community_users (source)'] = digest_where('community_users', "community_id = #{q(@plan.source.id)}")
      @digests['community_users (siblings)'] = @plan.sibling_ids.empty? ? empty : digest_where('community_users', "community_id IN (#{@plan.sibling_ids.join(',')})")
      @digests['credentials (company, all)'] = digest_where('credentials', "company_id = #{q(@plan.company.id)}")
      @digests['schedual_tours (source)'] = digest_where('schedual_tours', "community_id = #{q(@plan.source.id)}")
      @digests['tour_histories (source)'] = digest_where('tour_histories', "community_id = #{q(@plan.source.id)}")
      @digests['paths (all, count)'] = { 'count' => conn.select_value('SELECT count(*) FROM paths').to_i, 'md5' => nil }
      @digests['path_points (all, count)'] = { 'count' => conn.select_value('SELECT count(*) FROM path_points').to_i, 'md5' => nil }
      self
    end

    # [ [name, before, after], ... ] for every digest that differs.
    def compare(other)
      digests.keys.filter_map do |name|
        before = digests[name]
        after = other.digests[name]
        next if before == after

        [name, before, after]
      end
    end

    def to_h
      { 'captured_at' => captured_at, 'digests' => digests }
    end

    private

      def conn
        ActiveRecord::Base.connection
      end

      def q(value)
        conn.quote(value)
      end

      def empty
        { 'count' => 0, 'md5' => nil }
      end

      def digest(table, ids)
        return empty if ids.empty?

        digest_where(table, "id IN (#{ids.map(&:to_i).join(',')})")
      end

      def digest_where(table, where)
        row = conn.select_one("SELECT count(*) AS c, md5(string_agg(t::text, '|' ORDER BY t.id)) AS d FROM #{conn.quote_table_name(table)} t WHERE #{where}", Plan::SQL_NAME)
        { 'count' => row['c'].to_i, 'md5' => row['d'] }
      end
  end
end

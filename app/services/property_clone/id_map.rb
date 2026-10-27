# frozen_string_literal: true

module PropertyClone
  # source id -> clone id, per table. Serializable into the manifest.
  class IdMap
    def initialize(data = {})
      @data = Hash.new { |h, k| h[k] = {} }
      data.each { |table, pairs| pairs.each { |s, c| @data[table.to_s][s.to_i] = c.to_i } }
    end

    def set(table, source_id, clone_id)
      @data[table.to_s][source_id.to_i] = clone_id.to_i
    end

    def get(table, source_id)
      @data[table.to_s][source_id.to_i]
    end

    def known?(table)
      @data.key?(table.to_s)
    end

    def tables
      @data.keys
    end

    def clone_ids(table)
      @data[table.to_s].values
    end

    def source_ids(table)
      @data[table.to_s].keys
    end

    def count(table)
      @data[table.to_s].size
    end

    def to_h
      @data.transform_values { |pairs| pairs.transform_keys(&:to_s) }
    end

    def self.from_h(hash)
      new(hash || {})
    end
  end
end

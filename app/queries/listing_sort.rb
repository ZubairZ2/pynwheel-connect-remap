# Column sorting for the Pynwheel Connect listings (Companies, Properties).
#
# A listing offers a whitelist of sortable columns, each an SQL expression for
# the value the column displays. `sort` names one, `dir` is `asc` or `desc`;
# anything else keeps the listing's default order. Rows without a value (NULL)
# come last in both directions, and the default order breaks ties, so paging
# stays stable. Nothing is filtered or written: only the ORDER BY changes.
class ListingSort
  DIRECTIONS = %w[asc desc].freeze

  # The labels the Connect listings show for a `data_provider` slug (the
  # frontend's `providerLabel`, companyListing.generator.ts): a provider column
  # sorts on what it displays, so "psi" sorts as "Entrata / PSI". Unknown slugs
  # show, and sort, as themselves.
  PROVIDER_LABELS = {
    'yardi' => 'Yardi',
    'yardirentcafe' => 'Yardi RentCafe',
    'realpage' => 'RealPage',
    'realpagesvc' => 'RealPage',
    'psi' => 'Entrata / PSI',
    'entrata' => 'Entrata',
    'resman' => 'ResMan',
    'appfolio' => 'AppFolio',
    'mri' => 'MRI Living',
    'beans' => 'Beans',
    'onesite' => 'OneSite',
    'rentmanager' => 'Rent Manager',
    'zaremba' => 'Zaremba',
    'spreadsheet' => 'Spreadsheet',
    'xml' => 'XML Feed'
  }.freeze

  # A provider slug expression → its lower-cased display label, NULL when blank.
  # The slugs and labels are the literals above (no quotes to escape), so this
  # needs no database connection and is safe to build at class load.
  def self.provider_label_sql(slug_sql)
    slug = "LOWER(NULLIF(TRIM(#{slug_sql}), ''))"
    cases = PROVIDER_LABELS.map { |key, label| "WHEN '#{key}' THEN '#{label.downcase}'" }
    "CASE #{slug} #{cases.join(' ')} ELSE #{slug} END"
  end

  def initialize(columns, params)
    @columns = columns
    @key = params[:sort].to_s
    @dir = params[:dir].to_s.downcase
  end

  def active?
    columns.key?(key) && DIRECTIONS.include?(dir)
  end

  # Applies the requested order, then the default one as the tie-break.
  def apply(scope, *default_order)
    return scope.order(*default_order) unless active?

    scope.order(Arel.sql("#{columns.fetch(key)} #{dir.upcase} NULLS LAST"), *default_order)
  end

  private

    attr_reader :columns, :key, :dir
end

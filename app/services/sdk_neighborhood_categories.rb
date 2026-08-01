# The one place that knows how a neighborhood category is spelled.
#
# Three vocabularies have to agree and historically did not:
#
#   * the CMS, which stores display strings ("Dining") in a comma-separated
#     `neighborhoods.category` column and on each `locations.category` row
#   * Google Places, which wants machine types ("restaurant", "shopping_mall")
#   * the SDK host, which needs a stable key to filter and cache on
#
# The type lists are lifted verbatim from GoogleNeighbourhoodService#categories
# so the results the SDK returns match what the Touch apps have always shown.
module SdkNeighborhoodCategories
  # Slug => display label + the Google place types that make up the category.
  # Insertion order is the order categories are presented in.
  CATEGORIES = {
    "dining" => {
      label: "Dining",
      types: %w[restaurant].freeze
    },
    "shopping" => {
      label: "Shopping",
      types: %w[
        shopping_mall shoe_store department_store electronics_store clothing_store
        home_goods_store furniture_store pet_store book_store jewelry_store
      ].freeze
    },
    "entertainment" => {
      label: "Entertainment",
      types: %w[
        movie_theater bowling_alley amusement_park zoo stadium gym library
        aquarium art_gallery
      ].freeze
    },
    "schools" => {
      label: "Schools",
      types: %w[school].freeze
    },
    "banks" => {
      label: "Banks",
      types: %w[bank atm].freeze
    },
    "parks" => {
      label: "Parks",
      types: %w[park].freeze
    },
    "errands" => {
      label: "Errands",
      types: %w[
        car_repair car_wash gas_station hair_care hardware_store veterinary_care
        post_office pharmacy grocery supermarket convenience_store
      ].freeze
    }
  }.freeze

  # Slug used when a CMS row holds something outside the vocabulary. The column
  # is free text, so old or hand-edited rows can hold anything; they still need
  # a stable key to group under rather than being dropped.
  OTHER = "other".freeze

  # Spellings seen in the wild, on top of the slugs themselves. The CMS forms
  # offer plurals ("Schools") while the legacy Google proxy took singulars
  # ("school"), and both reached this table.
  ALIASES = {
    "restaurant"  => "dining",
    "restaurants" => "dining",
    "food"        => "dining",
    "shop"        => "shopping",
    "shops"       => "shopping",
    "school"      => "schools",
    "bank"        => "banks",
    "park"        => "parks",
    "errand"      => "errands"
  }.freeze

  # slug => slug, plus every alias, resolved once at boot.
  INDEX = CATEGORIES.keys.index_with { |slug| slug }.merge(ALIASES).freeze

  module_function

  def slugs
    CATEGORIES.keys
  end

  def known?(slug)
    CATEGORIES.key?(slug.to_s)
  end

  def label_for(slug)
    CATEGORIES.dig(slug.to_s, :label)
  end

  def types_for(slug)
    CATEGORIES.dig(slug.to_s, :types) || []
  end

  # Normalise any CMS or query-string spelling to a slug. Returns OTHER for
  # anything unrecognised, and nil only for blank input.
  #
  #   slug_for("Dining")     # => "dining"
  #   slug_for(" Schools ")  # => "schools"
  #   slug_for("Dog Parks")  # => "other"
  def slug_for(value)
    normalised = normalise(value)
    return nil if normalised.blank?

    INDEX[normalised] || OTHER
  end

  # Label to show for a value that may or may not be in the vocabulary. Known
  # slugs get their canonical label; anything else keeps what the CMS typed, so
  # an unrecognised row still reads correctly in the UI.
  def label_for_value(value)
    slug = slug_for(value)
    return nil if slug.nil?

    label_for(slug) || value.to_s.strip
  end

  def normalise(value)
    value.to_s.strip.downcase.gsub(/[^a-z0-9]+/, "_").gsub(/\A_+|_+\z/, "")
  end
end

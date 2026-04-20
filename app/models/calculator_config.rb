class CalculatorConfig < ApplicationRecord
  belongs_to :community

  # config_json holds the entire pricing configuration as a JSONB blob.
  # Bucket fields: orderIndex, receiptBucket, feeType ("monthly"|"one_time"), bucketDisclaimer, categories
  # Fee fields: feeName, pricingLogic, baseMinPrice, baseMaxPrice, isMandatoryDefault,
  #             hasQuantityCounter, qtyMinLimit, qtyMaxLimit, variesByBedroom, bedroomPricing,
  #             perApplicant, perPet, perVehicle, displayText, preSelectionInfo, postSelectionInfo

  def publish!
    update!(published_config_json: config_json, published_at: Time.current)
  end

  def has_unpublished_changes?
    return true if published_config_json.nil?
    config_json != published_config_json
  end

  def published_sdk_json
    published_config_json.presence || {}
  end

  def as_sdk_json
    published_sdk_json
  end
end

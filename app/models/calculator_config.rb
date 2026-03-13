class CalculatorConfig < ApplicationRecord
  belongs_to :community

  # config_json holds the entire pricing configuration as a JSONB blob.
  # Bucket fields: orderIndex, receiptBucket, feeType ("monthly"|"one_time"), bucketDisclaimer, categories
  # Fee fields: feeName, pricingLogic, baseMinPrice, baseMaxPrice, isMandatoryDefault,
  #             hasQuantityCounter, qtyMinLimit, qtyMaxLimit, variesByBedroom, bedroomPricing,
  #             perApplicant, perPet, perVehicle, displayText, preSelectionInfo, postSelectionInfo

  def as_sdk_json
    config_json.presence || {}
  end
end

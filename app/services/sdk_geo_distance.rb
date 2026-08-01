# Great-circle distance between two lat/lng pairs.
#
# Stands alone rather than living on either neighborhood service because both
# need it and neither owns it: the builder fills in a distance the CMS operator
# left blank, and the places service both sorts and radius-filters on it.
module SdkGeoDistance
  EARTH_RADIUS_MILES = 3958.7613
  METRES_PER_MILE    = 1609.344

  module_function

  # Distance in miles, rounded to one decimal — the precision a "0.4 mi" label
  # actually shows. Returns nil when either point is incomplete, so callers can
  # tell "too far" apart from "unknown".
  def miles_between(lat1, lng1, lat2, lng2)
    return nil if [lat1, lng1, lat2, lng2].any?(&:blank?)

    rad1  = to_radians(lat1)
    rad2  = to_radians(lat2)
    d_lat = to_radians(lat2.to_f - lat1.to_f)
    d_lng = to_radians(lng2.to_f - lng1.to_f)

    a = (Math.sin(d_lat / 2)**2) +
        (Math.cos(rad1) * Math.cos(rad2) * (Math.sin(d_lng / 2)**2))

    (2 * EARTH_RADIUS_MILES * Math.asin([Math.sqrt(a), 1.0].min)).round(1)
  end

  def metres_to_miles(metres)
    return nil if metres.blank?

    metres.to_f / METRES_PER_MILE
  end

  def to_radians(degrees)
    degrees.to_f * Math::PI / 180
  end
end

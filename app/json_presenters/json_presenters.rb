class JsonPresenters
  local_assets_base_url = "http://192.168.101.77:3000"
  # attr_accessor :local_assets_base_url
  # def initialize(hash)
  #   @local_assets_base_url = "http://192.168.101.77:3000"
  # end
  def convert_float_to_integer(x)
    if x%1 == 0
      return x.to_i
    else
      return x
    end
  end
end
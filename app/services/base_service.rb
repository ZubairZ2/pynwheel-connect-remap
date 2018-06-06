class BaseService
  attr_accessor :credentials
  def initialize(hash)
    @credentials = OpenStruct.new(hash)
  end

  def evaluate_floor(marketing_name)
    marketing_name = marketing_name.gsub('-','')
    floor = 1
    if marketing_name.size == 3
      floor = marketing_name.first(1)
    elsif marketing_name.size > 3
      floor = marketing_name.first(2)
    end
    return floor 
  end
end

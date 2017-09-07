class BaseService
	attr_accessor :credentials
	def initialize(hash)
		@credentials = OpenStruct.new(hash)
	end
end

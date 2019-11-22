class ApplicationJob < ActiveJob::Base
	SuckerPunch.shutdown_timeout = 180
end

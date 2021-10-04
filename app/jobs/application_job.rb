class ApplicationJob < ActiveJob::Base
	SuckerPunch.shutdown_timeout = 500
end

class ApplicationJob < ActiveJob::Base
	SuckerPunch.shutdown_timeout = 30
end

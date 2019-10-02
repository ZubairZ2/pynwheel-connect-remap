class ApplicationJob < ActiveJob::Base
	SuckerPunch.shutdown_timeout = 60
end

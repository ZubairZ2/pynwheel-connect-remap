class ApplicationJob < ActiveJob::Base
	SuckerPunch.shutdown_timeout = 50
end

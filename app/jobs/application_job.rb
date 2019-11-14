class ApplicationJob < ActiveJob::Base
	SuckerPunch.shutdown_timeout = 420
end

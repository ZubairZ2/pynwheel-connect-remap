class ApplicationJob < ActiveJob::Base
	SuckerPunch.shutdown_timeout = 240
end

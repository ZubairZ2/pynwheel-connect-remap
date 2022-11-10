class ApplicationJob < ActiveJob::Base
	SuckerPunch.shutdown_timeout = 86400 #after 1 day
end

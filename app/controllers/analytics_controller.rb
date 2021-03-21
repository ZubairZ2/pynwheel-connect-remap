class AnalyticsController < ApplicationController
  
  def index
  	@track_session_count = TrackSession.count
  	
  	arr = [65, 59, 80, 81, 56, 55, 40]
  	@data = {
		  labels: ["January", "February", "March", "April", "May", "June"],
		  datasets: [
		    {
		        label: "My First dataset",
		        backgroundColor: "rgba(60,141,188,1)",
		        borderColor: "rgba(220,220,220,1)",
		        data: arr
		    }
		  ]
		}
		@options = { legend: {display: false} }
  end

end

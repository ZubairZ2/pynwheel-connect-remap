class TrackSession < ApplicationRecord
   belongs_to :community

 def start_datetime_in_limit?
   current_datetime = DateTime.now.utc
   start_datetime = self.start_datetime.utc
   cms_session_limit = 10.minutes 
   (current_datetime - start_datetime) > cms_session_limit # return true to make a new record
  end

end

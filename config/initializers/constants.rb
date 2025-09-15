INFO_EMAIL = "info@pynwheel.com"
NEW_CLIENT = "New Client"
DEFAULT_TIME_ZONE = "America/Los_Angeles"
SUBMITTED = "submitted"
IN_PROGRESS = "in_progress"
APPROVED = "approved"
REJECTED = "rejected"
DEPLOYED = "deployed"
COMMUNITY_DETAILS = "Your Community Details"
PROPERTY_MAP_IMAGES = "Property Map Images"
FLOORPLAN_IMAGES = "Floor Plan Images"
PROPERTY_MANAGEMENT_SYSTEM = "Connect Your Property Management System"
LOCK_PROVIDER = "Secure Access Settings"
TOUR_STOPS = "Manage Your Stops for Pynwheel Tour App"
VISITING_HOURS = "Visiting Hours for Tours"
TOUCH_GALLERY_MEDIA = "Gallery Media/Property Images"
HARDWARE_SPECS = "Touchscreen Installation Details"
TOUCH_HOME_PAGE_MEDIA = "Slideshow/Video for Pynwheel Touch Home Page"
SITEMAP = "garden_style_community"
FLOORPLATE = "mid_high_rise_community"
HOMEPAGE_VIDEO = "videos"
HOMEPAGE_IMAGE = "images"
API_TOKEN = "Api Token"
PROPERTY_CODE = "Property Code"
EDGESTATE = "EdgeState"
DWELO = "Dwelo"
LATCH = "Latch"
OTHERLOCK = "Other"
LATCHCLIENT = "LATCH"
ZERV = "Zerv"
ZERVCLIENT = "Standard fob reader (Pynwheel to retrofit to work with Pynwheel App)"
IGLOOHOME = "Igloohome"
IGLOOHOMECLIENT = "Igloohome / Iglooworks"
REMOTELOCK = "Remote"
REMOTELOCKCLIENT = "RemoteLock"
YALELOCK = "Yale"
YALELOCKCLIENT = "Yale Assure"
SCHLAGELOCK = "Schlage"
SCHLAGELOCKCLIENT = "Schlage Z-Wave, Encode, or Control"
SELF_TOUR = "Self_tour"
GUIDED_TOUR = "Guided_tour"
EXPRESSIONIST = "Expressionist"
PARAM_NOT_STARTED= "not_started"
PARAM_100_CONTENT_SUBMITED = "100_content_submitted"
PARAM_APPROVED_FOR_PRODUCTION = "approved_for_production"
COMPANY_DETAILS = "Your Company Details"
USER_NOT_REGISTERED = "user_registration_not_completed_email"
APPLICATION_NOT_STARTED = "application_not_started_email"
APPLICATION_IN_PROGRESS = "application_in_progress_email"
APPLICATION_SUBMITTED = "application_submitted_email"
APPLICATION_IN_REVIEW = "in_review"
PARAM_APPLICATION_IN_QA = "Application in QA"
APPLICATION_IN_QA = "application_in_qa"
APPLICATION_IN_PRODUCTION = "in_production"
PARAM_RELEASED = "Released"
RELEASED = "released"
FORM_APPROVED = "form_approved"
PARAM_APPROVED = "approved"
PARAM_REJECTED = "Rejected"
IN_PRODUCTION = "In Production"
YARDI_RENT_CAFE_API_BASE_URLS = ["https://api.rentcafe.com","https://api.rentcafe.co.uk"]
DESIGN_DIRECTION = "Design Direction"
AMENITY_IMAGES = "Amenity Images"
EBROCHURE = "eBrochure"
ADDITIONAL_PAGES = "Additional Pages"
WEBPAGE = "webpage"
IMAGEPAGE = "imagepage"
MAJOR_CURRENCIES = ["840", "826", "124"]
ZERV_LOCK_INSTRUCTION_TEXT = "When you are near the fob reader press unlock below to gain access."
UNIT_LATCH_LOCK_INSTRUCTION_TEXT = "When you are near the door tap the 'unlock' button below to unlock the door and turn the lever to the right to unlock the door. Apple users: If your apple wallet opens, move your phone further from the device."
AMENITY_LATCH_LOCK_INSTRUCTION_TEXT = "When you are near the door tap the 'unlock' button below to unlock the door. Apple users: If your apple wallet opens, move your phone further from the device."

IGLOOHOME_LOCK_INSTRUCTION_TEXT = "Tap the black circle to wake lock up. Enter code then press the unlock button in the middle of the lock face."
ELEVATOR_STOP_TEXT = "The next stop is on floor "

SELF_TOUR_PROVIDERS = ["yardirentcafe", "realpagesvc", "psi", "resman"]
UNIT_STATUSES = ["unoccupied", "vacant unrented ready"]
HIDE_UNIT_PATTERN = "wait"

# TOUCH INFO
TOUCH_SESSIONS_INFO = "One “Session” is defined as an instance in which the user goes from the Home screen to at least one other page and then back to the Home screen."
TOUCH_SESSION_DURATION = "Amount of time a user spends on the app during a single activity. Note that a activity starts from the home page, so if a user begins to use the touchscreen after another user, and before the app returns to the home page, this will not be tallied as a new activity."
TOUCH_SESSIONS_BY_TIME_OF_DAY_INFO = "Number of sessions per time of day at the location of the property. This graph shows the trends of traffic at the touchscreen."
TOUCH_SINGLE_VS_MULTIPLE_PAGE_VISITS_INFO = "A single page visit means one page in addition to the home page. This does not necessarily imply that the session was not valuable because each page provides value. However, multiple page visits implies greater engagement during the leasing agent’s presentation."
TOUCH_EVENTS_INFO = "”Events” include favorites saved, brochures sent, and pricing opened."
TOUCH_FAVORITE_SAVED_INFO = "This is the tally of the number of floor plans or images that users have favorited."
TOUCH_FAVORITE_MAILED_INFO = "The total number of ebrochures sent. Ideally, leasing agents will send an ebrochure to every visitor."
TOUCH_PAGES_PER_SESSION_INFO = "The average number of pages per session. Ideally, leasing agents should be hitting all pages."
TOUCH_TOP_PAGES_INFO = "The most popular pages visited in the Pynwheel Touch application."
TOUCH_INTERFACE_USED_INFO = "Total sessions on an Android Tablet or iPad/iPhone  versus sessions on a Windows device (touchscreen or other Windows device such as a Surface)."
TOUCH_TYPES = ["metro", "ipad"]

# SELF TOUR INFO
SELF_TOUR_TOURS_INFO = "A tour is defined as any usage of the app once the “start tour” button has been touched, regardless of whether or not they visit any stops before the app is closed."
SELF_TOUR_TOURS_DURATION = "Amount of time a user spends in the tour starting with the first stop, before they end the tour or close the application."
SELF_TOUR_TOURS_BY_TIME_OF_DAY_INFO = "Number of tours per time of day at the location of the property. This graph shows the trends of tour traffic."
SELF_TOUR_APP_OPENS_INFO = "Shows the number of times a user opened a property’s app but did not conduct a tour. For example, if a user opened the app a day prior to the tour to make sure they could access it."
SELF_TOUR_EVENTS_INFO = "“Events” include action taken by the user such as Availability opened, Apply opened, Notes opened, Camera opened, and Pricing opened."
SELF_TOUR_TOUR_LOCATION_INFO = "Users can either take a tour on-site or they can opt to take a virtual tour from a remote location, which does not give them access to unlock locked doors. This shows the number of tours that were location-based tours and non-location based tours based on which option the user selected (not necessarily their geographic position)."
SELF_TOUR_APPLY_CLICKS_INFO = "The number of times users touched the apply link in the application."
SELF_TOUR_SEE_AVAILABILITY_INFO = "The number of times users touched the availability link in the application."
SELF_TOUR_SCHEDULED_VS_UNSCHEDULED_INFO = "The number of tours that were scheduled in advance versus on the fly, without prior scheduling."
SELF_TOUR_TOUR_COMPLETION_INFO = "The number of tours during which the visitor visited every stop on the tour and went all the way to the thank you page before closing the app."
SELF_TOUR_STOPS_PER_TOUR_INFO =  "The number of stops that were visited during the tour."
SELF_TOUR_TOP_STOPS_INFO = "The most visited stops on a tour by type"
SELF_TOUR_NO_SHOWS = "The number of scheduled tours that did not use the application to conduct a tour."


# Maps INFO
# MAPS_SESSIONS_INFO = "Map interaction is defined as an instance in which the user interacts with the Pynwheel Map until the browser is closed or the activity is idle for two minutes."
MAPS_SESSIONS_INFO = "Map interaction is defined as a session of a highly engaged user during which one or more of the following events occurs: opens a pricing modal; saves a favorite; clicks on “apply now”; clicks to share favorites. A session begins when the map is loaded and ends when the map is closed or the activity is idle for two minutes."
MAPS_SESSION_DURATION = "Average duration of interaction on the Pynwheel Map until the browser is closed or the activity is idle for two minutes."
MAPS_SESSIONS_BY_TIME_OF_DAY_INFO = "Number of interactions per time of day at the location of the user."
MAPS_SINGLE_VS_MULTIPLE_PAGE_VISITS_INFO = "A single page visit means the user only visited the map. Multiple pages means that they also visited the Favorites page."
MAPS_EVENTS_INFO = "”Events” include favorites saved, clicks on the “Share” button, and clicks on the “Apply” button."
MAPS_APPLY_CLICKS_INFO = "The number of times users touched the “apply” button for a particular unit."
MAPS_FAVORITE_SAVED_INFO = "This is the tally of the number of units or images that users have marked as a favorite."
MAPS_FAVORITE_SHARED_INFO = "The number of times that the user clicks on the “Share” button from the Favorites page."

#Info Bubble Text
VIRTUAL_TOUR_BUBBLE_TEXT = "Add a Virtual Tour URL specific to this Unit/Floorplan which will appear on the interactive map and in the Unit/Floorplan gallery. URLs added at the unit level supersede URLs added here at the floor plan level: URL entered here will not appear on the unit pop-up if enough URLs are added at the unit level. Pynwheel Map can accommodate up to 3 buttons. Pynwheel Touch can accommodate up to 1 button. Pynwheel Touch Mobile can accommodate up to 1 button. Pynwheel Tour can accommodate up to 1 button."
ADDITIONAL_BUTTON_BUBBLE_TEXT = "Add a Additional URL specific to this Unit/Floorplan which will appear on the interactive map and in the Unit/Floorplan gallery. URLs added at the unit level supersede URLs added here at the floor plan level: URL entered here will not appear on the unit pop-up if enough URLs are added at the unit level. Pynwheel Map can accommodate up to 3 buttons. Pynwheel Touch can accommodate up to 1 button. Pynwheel Touch Mobile can accommodate up to 1 button. Pynwheel Tour can accommodate up to 1 button."
SCHEDULED_TOUR_BUBBLE_TEXT = "Add a Scheduled Tour URL specific to this Unit/Floorplan which will appear on the interactive map and in the Unit/Floorplan gallery. URLs added at the unit level supersede URLs added here at the floor plan level: URL entered here will not appear on the unit pop-up if enough URLs are added at the unit level. Pynwheel Map can accommodate up to 3 buttons. Pynwheel Touch can accommodate up to 1 button. Pynwheel Touch Mobile can accommodate up to 1 button. Pynwheel Tour can accommodate up to 1 button."

DUMMY_COMMUNITY_NAME = "@@@"

SOFIA_ID = 2919
MANUAL_SORTING_FLOORS = [2, 3]

PROPERTIES_LIST = [2919]
SHOW_ON_MAP = ["yardirentcafe", "psi"]

REPORTS = [
  {
    title: "Account Report",
    path: "account_report",
    has_date_range: false,
    partner: false,
    partner_list: []
  },
  {
    title: "Touch Sessions Report",
    path: "generate_sessions_report",
    has_date_range: true,
    partner: false,
    partner_list: []
  },
  {
    title: "Unplotted Units Report",
    path: "unplotted_units_report",
    has_date_range: false,
    partner: false,
    partner_list: []
  },
  {
    title: "Map Type (Floorplates vs Map) Report",
    path: "properties_average_data_report",
    has_date_range: false,
    partner: false,
    partner_list: []
  },
  {
    title: "Webpages Report",
    path: "generate_webpages_report",
    has_date_range: false,
    partner: false,
    partner_list: []
  },
  {
    title: "Salesforce Report",
    path: "generate_salesforce_report",
    has_date_range: false,
    partner: false,
    partner_list: []
  },
  {
    title: "Tour Feedback Report",
    path: "tour_feedback_report",
    has_date_range: false,
    partner: false,
    partner_list: []
  },
  {
    title: "Partner Analytics Report",
    path: "partner_analytics_report",
    has_date_range: true,
    partner: true,
    partner_list: ["apartmentlist", "rent"]
  },
  {
    title: "Partner Floor Level Map URLs Report",
    path: "export_floor_map_urls",
    has_date_range: false,
    partner: false,
    partner_list: []
  },
  {
    title: "Properties Without Map Sessions Last 30 Days",
    path: "maps_no_session_report",
    has_date_range: false,
    partner: false,
    partner_list: []
  }
]
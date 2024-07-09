module AppLinks
  LINKS = {
    lincoln: {
      app: "https://apps.apple.com/us/app/lincoln-property-self-tour/id1508997129",
      android: "https://play.google.com/store/apps/details?id=com.pynwheel.lincolnselftour"
    },
    default: {
      app: "https://apps.apple.com/us/app/self-tour/id1488907392",
      android: "https://play.google.com/store/apps/details?id=com.pynwheel.selftour"
    }
  }.freeze

  def self.get_app_link(company_name)
    LINKS.fetch(company_name.to_sym, LINKS[:default])[:app]
  end

  def self.get_android_link(company_name)
    LINKS.fetch(company_name.to_sym, LINKS[:default])[:android]
  end

  def self.one_link company_name
    company_name == "lincoln" ? "http://onelink.to/6fsxvq" : "http://onelink.to/m5vuhn"
  end
end
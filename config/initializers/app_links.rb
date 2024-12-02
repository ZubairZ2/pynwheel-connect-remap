module AppLinks
  LINKS = {
    lincoln: {
      app: "https://apps.apple.com/us/app/lincoln-property-self-tour/id1508997129",
      android: "https://play.google.com/store/apps/details?id=com.pynwheel.lincolnselftour",
      one_link: "http://onelink.to/6fsxvq",
      app_identification_text: "Lincoln Property Company Pynwheel Tour"
    },
    default: {
      app: "https://apps.apple.com/us/app/self-tour/id1488907392",
      android: "https://play.google.com/store/apps/details?id=com.pynwheel.selftour",
      one_link: "http://onelink.to/m5vuhn",
      app_identification_text: "Pynwheel Tour"
    }
  }

  def self.get_app_link(company_name)
    LINKS.fetch(company_name.to_sym, LINKS[:default])[:app]
  end

  def self.get_android_link(company_name)
    LINKS.fetch(company_name.to_sym, LINKS[:default])[:android]
  end

  def self.one_link company_name
    if company_name == "lincoln"
      LINKS.fetch(company_name.to_sym, LINKS[:lincoln])[:one_link]
    else
      LINKS.fetch(company_name.to_sym, LINKS[:default])[:one_link]
    end
  end

  def self.app_identification_text company_name
    if company_name == "lincoln"
      LINKS.fetch(company_name.to_sym, LINKS[:lincoln])[:app_identification_text]
    else
      LINKS.fetch(company_name.to_sym, LINKS[:default])[:app_identification_text]
    end
  end
end
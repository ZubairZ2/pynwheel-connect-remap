module Api::V2::Utils::Serializers
  class Message < Serializer
    def initialize type: , http_status:, title:, detail:
      @json = {
            "success": type,
            "status_code": http_status,
            "message":  title,
            "detail": detail
      }
    end
  end
end

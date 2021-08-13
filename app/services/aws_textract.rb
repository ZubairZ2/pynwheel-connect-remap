class AwsTextract < BaseService
  def self.aws_texract_ocr_service image
    aws_detect_text(aws_client, image)
  end
  
  private

  def self.aws_client
    Aws::Textract::Client.new(
      region: "us-west-2",
      access_key_id: ENV["AWS_ACCESS_KEY_ID"],
      secret_access_key: ENV["AWS_SECRET_ACCESS_KEY"]
    )
  end

  def self.aws_detect_text client, image
    resp = client.detect_document_text({
            document: {
              s3_object: {
                  bucket: ENV["S3_BUCKET_NAME"],
                  name: image_name(image),
                }
              }
            })


    puts "-----------------"*10
    puts resp.inspect
    puts "-----------------"*10


    if resp.present? && resp.blocks.present?
      resp.blocks.map {|block| {text: block.text, width: block.geometry.bounding_box.width, height: block.geometry.bounding_box.height, top: block.geometry.bounding_box.top, left: block.geometry.bounding_box.left, polygone: block.geometry.polygon}}
    else
      []
    end
  end

  def self.image_name image
    image.slice(image.index("uploads")..-1) if image.present?
  end
end
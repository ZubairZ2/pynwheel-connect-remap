require 'test_helper'

# Connect::UploadUrl resolves where a stored upload really is. These tests
# drive the bucket logic with a stubbed HEAD and a stubbed list of known
# buckets, so no network and no S3 is touched.
class Connect::UploadUrlTest < ActiveSupport::TestCase
  CONFIGURED = 'https://staging-pynwheel.s3.us-west-2.amazonaws.com'.freeze
  FAMILY = 'https://images-pynwheel-cms-v2.s3.us-west-2.amazonaws.com'.freeze
  OTHER = 'https://other-env-bucket.s3.amazonaws.com'.freeze
  KEY = '/uploads/floorplate/svg_image/4604/1790021794-Floor_3_noBG.svg'.freeze

  setup do
    @heads = []
    Rails.cache.clear
    Connect::UploadUrl.forget_known_buckets!
  end

  teardown do
    Connect::UploadUrl.http = nil
    Rails.cache.clear
    Connect::UploadUrl.forget_known_buckets!
  end

  # HEAD answers per URL: true / false / nil (could not be checked).
  def head(answers)
    Connect::UploadUrl.http = lambda do |url|
      @heads << url
      answers.fetch(url) { raise "unexpected HEAD #{url}" }
    end
  end

  def known(*bases)
    Rails.cache.write(Connect::UploadUrl::KNOWN_BUCKETS_CACHE_KEY, bases, expires_in: 1.hour)
  end

  test 'the configured bucket is kept, with no HEAD, when the database names no other bucket' do
    head({})
    known(CONFIGURED)
    assert_equal "#{CONFIGURED}#{KEY}", Connect::UploadUrl.reachable_copy("#{CONFIGURED}#{KEY}", nil)
    assert_equal "#{CONFIGURED}#{KEY}", Connect::UploadUrl.reachable_copy("#{CONFIGURED}#{KEY}", CONFIGURED)
    assert_empty @heads, 'production (one bucket everywhere) never probes'
  end

  test 'a family bucket that holds the file replaces the configured one after the configured URL is refused' do
    head("#{CONFIGURED}#{KEY}" => false, "#{FAMILY}#{KEY}" => true)
    known(FAMILY)
    assert_equal "#{FAMILY}#{KEY}", Connect::UploadUrl.reachable_copy("#{CONFIGURED}#{KEY}", FAMILY)
    assert_equal ["#{CONFIGURED}#{KEY}", "#{FAMILY}#{KEY}"], @heads
  end

  test 'a property without any raster upload still finds its file on a bucket the environment knows' do
    head("#{CONFIGURED}#{KEY}" => false, "#{FAMILY}#{KEY}" => true)
    known(FAMILY) # from other properties' standard URLs
    assert_equal "#{FAMILY}#{KEY}", Connect::UploadUrl.reachable_copy("#{CONFIGURED}#{KEY}", nil), 'no family bucket of its own'
    assert_equal "#{FAMILY}#{KEY}", Connect::UploadUrl.reachable_copy("#{CONFIGURED}#{KEY}", -> { nil }), 'an empty bucket hint'
  end

  test 'a check that could not be made on the configured URL still lets a known copy win' do
    head("#{CONFIGURED}#{KEY}" => nil, "#{OTHER}#{KEY}" => false, "#{FAMILY}#{KEY}" => true)
    known(OTHER, FAMILY)
    assert_equal "#{FAMILY}#{KEY}", Connect::UploadUrl.reachable_copy("#{CONFIGURED}#{KEY}", nil)
    assert_equal ["#{CONFIGURED}#{KEY}", "#{OTHER}#{KEY}", "#{FAMILY}#{KEY}"], @heads, 'the family bucket is asked first, then the known ones in order'
  end

  test 'the configured URL stays when it answers, and when no known bucket holds the file' do
    head("#{CONFIGURED}#{KEY}" => true)
    known(FAMILY)
    assert_equal "#{CONFIGURED}#{KEY}", Connect::UploadUrl.reachable_copy("#{CONFIGURED}#{KEY}", FAMILY)
    assert_equal ["#{CONFIGURED}#{KEY}"], @heads

    @heads.clear
    Rails.cache.clear
    known(FAMILY)
    head("#{CONFIGURED}#{KEY}" => false, "#{FAMILY}#{KEY}" => false)
    assert_equal "#{CONFIGURED}#{KEY}", Connect::UploadUrl.reachable_copy("#{CONFIGURED}#{KEY}", FAMILY), 'nothing better: the configured URL is reported, not hidden'
  end

  test 'answers are remembered per URL for a day; a failed check only briefly' do
    calls = 0
    Connect::UploadUrl.http = lambda do |_url|
      calls += 1
      calls == 1 ? nil : true
    end
    assert_nil Connect::UploadUrl.reachable?("#{FAMILY}#{KEY}")
    assert_nil Connect::UploadUrl.reachable?("#{FAMILY}#{KEY}"), 'an unreachable store is not asked again at once'
    assert_equal 1, calls
    travel(Connect::UploadUrl::FAILED_CHECK_TTL + 1.second) do
      assert_equal true, Connect::UploadUrl.reachable?("#{FAMILY}#{KEY}")
      assert_equal true, Connect::UploadUrl.reachable?("#{FAMILY}#{KEY}")
    end
    assert_equal 2, calls
  end

  test 'a fog store is asked where its file is; file storage (development) names the bucket the database points at and sends nothing' do
    plate = floorplates(:plate_a)
    plate.update_columns(svg_image: '1790024432-Floor_1_noBG.svg', standard_image_url: '')
    key = "/uploads/floorplate/svg_image/#{plate.id}/1790024432-Floor_1_noBG.svg"
    configured = Connect::UploadUrl.s3_base(plate.svg_image.url)
    assert configured, 'the test environment stores on fog, like production'
    head("#{configured}#{key}" => false, "#{FAMILY}#{key}" => true)
    known(FAMILY)

    url = Connect::UploadUrl.upload(plate, :svg_image, 'http://test.host', bucket: nil)
    assert_equal "#{FAMILY.sub('.s3.us-west-2.', '.s3-accelerate.')}#{key}", url, 'fog: the known bucket that holds the file, through S3 acceleration'
    assert_equal ["#{configured}#{key}", "#{FAMILY}#{key}"], @heads

    @heads.clear
    Rails.cache.clear
    known(FAMILY)
    Connect::UploadUrl.stub(:on_fog?, false) do
      url = Connect::UploadUrl.upload(plate, :svg_image, 'http://test.host', bucket: nil)
      assert_equal "#{configured.sub(/\.s3[.-][^.]*\.|\.s3\./, '.s3-accelerate.')}#{key}", url, 'file storage: the URL the database points at, unprobed'
      assert_empty @heads, 'no HEAD under file storage'
    end
  end

  test 'a non-S3 URL (a CMS-host path in development) is left alone' do
    head({})
    known(FAMILY)
    assert_equal '/uploads/floorplate/svg_image/1/a.svg', Connect::UploadUrl.reachable_copy('/uploads/floorplate/svg_image/1/a.svg', FAMILY)
    assert_equal 'https://cdn.example.com/x.svg', Connect::UploadUrl.reachable_copy('https://cdn.example.com/x.svg', FAMILY)
    assert_empty @heads
  end

  test 'a stored key missing on disk is read from the family bucket, else from the first known bucket' do
    known(FAMILY, OTHER)
    assert_equal "#{OTHER}#{KEY}", Connect::UploadUrl.stored_copy(KEY, OTHER)
    assert_equal "#{FAMILY}#{KEY}", Connect::UploadUrl.stored_copy(KEY, nil)
    assert_equal "#{FAMILY}#{KEY}", Connect::UploadUrl.stored_copy(KEY, -> { '' })
    known
    assert_equal KEY, Connect::UploadUrl.stored_copy(KEY, nil), 'nothing known: the local path stays'
  end

  test 'known_buckets reads the buckets the recent raster uploads name, one per bucket, and caches them' do
    plate = floorplates(:plate_a)
    plate.update_columns(standard_image_url: "#{FAMILY}/uploads/floorplate/image/#{plate.id}/a.png")
    floorplates(:plate_b).update_columns(standard_image_url: "#{OTHER}/uploads/floorplate/image/#{floorplates(:plate_b).id}/b.png")
    assert_equal [OTHER, FAMILY].sort, Connect::UploadUrl.known_buckets.sort
    plate.update_columns(standard_image_url: 'https://elsewhere.s3.amazonaws.com/uploads/floorplate/image/1/c.png')
    assert_equal [OTHER, FAMILY].sort, Connect::UploadUrl.known_buckets.sort, 'cached for the day'
    Connect::UploadUrl.forget_known_buckets!
    assert_includes Connect::UploadUrl.known_buckets, 'https://elsewhere.s3.amazonaws.com'
  end

  test 's3_base and bucket_name read the virtual-hosted, regional and accelerate forms' do
    assert_equal 'https://images-pynwheel-cms-v2.s3.amazonaws.com', Connect::UploadUrl.s3_base('https://images-pynwheel-cms-v2.s3.amazonaws.com/uploads/x/y.png')
    assert_equal 'https://images-pynwheel-cms-v2.s3.us-west-2.amazonaws.com', Connect::UploadUrl.s3_base('https://images-pynwheel-cms-v2.s3.us-west-2.amazonaws.com/uploads/x/y.png')
    assert_equal 'https://b.s3-accelerate.amazonaws.com', Connect::UploadUrl.s3_base('https://b.s3-accelerate.amazonaws.com/uploads/x/y.png')
    assert_nil Connect::UploadUrl.s3_base('https://images-pynwheel-cms-v2.s3.amazonaws.com/other/y.png')
    assert_equal 'images-pynwheel-cms-v2', Connect::UploadUrl.bucket_name('https://images-pynwheel-cms-v2.s3.us-west-2.amazonaws.com')
    assert_equal 'b', Connect::UploadUrl.bucket_name('https://b.s3-accelerate.amazonaws.com')
  end
end

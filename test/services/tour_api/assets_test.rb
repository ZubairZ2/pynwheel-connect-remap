require 'test_helper'

class TourApi::AssetsTest < ActiveSupport::TestCase
  setup { TourApi::Assets.clear!(disk: true) }

  teardown do
    TourApi::Assets.clear!(disk: true)
    TourApi::Assets.http = nil
  end

  test 'a fetched file is kept on disk and survives a cleared memory cache' do
    fetched = 0
    TourApi::Assets.http = lambda do |_url|
      fetched += 1
      [200, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 7 7"/>']
    end
    url = 'https://bucket.s3.amazonaws.com/uploads/floorplate/svg_image/5/plan.svg'
    first = TourApi::Assets.svg(url)
    TourApi::Assets.clear! # the process restarted (or another worker asks)
    second = TourApi::Assets.svg(url)
    assert_equal 1, fetched, 'the second read came from the disk cache'
    assert_equal first.etag, second.etag
    assert File.file?(TourApi::Assets.disk_path(url))
    TourApi::Assets.http = ->(_url) { [200, '<html/>'] }
    assert_raises(TourApi::Assets::Error) { TourApi::Assets.svg('https://bucket.s3.amazonaws.com/uploads/x/bad.svg') }
    assert_not File.file?(TourApi::Assets.disk_path('https://bucket.s3.amazonaws.com/uploads/x/bad.svg')), 'an invalid file is never written'
  end

  test 'view_box_of reads the root viewBox or the width/height, from the first element only' do
    assert_equal [0.0, 0.0, 1412.16, 912.24], TourApi::Assets.view_box_of('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1412.16 912.24"/>')
    assert_equal [0.0, 0.0, 800.0, 600.0], TourApi::Assets.view_box_of('<svg xmlns="http://www.w3.org/2000/svg" width="800px" height="600px"/>')
    illustrator = %(<?xml version="1.0"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "x.dtd" [ <!ENTITY ns_ai "http://ns.adobe.com/AdobeIllustrator/10.0/"> ]><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2000 2000"><g/></svg>)
    assert_equal [0.0, 0.0, 2000.0, 2000.0], TourApi::Assets.view_box_of(illustrator)
    assert_nil TourApi::Assets.view_box_of('<svg xmlns="http://www.w3.org/2000/svg"><g/></svg>')
    ['<html><body>no</body></html>', '<svg', '', "PNG\x89".b].each do |bad|
      error = assert_raises(TourApi::Assets::Error) { TourApi::Assets.view_box_of(bad) }
      assert_equal 'invalid_svg', error.code, bad.inspect
    end
  end

  test 'only S3 and this host are read; files are validated and cached' do
    fetched = []
    TourApi::Assets.http = lambda do |url|
      fetched << url
      [200, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"/>']
    end
    url = 'https://bucket.s3-accelerate.amazonaws.com/uploads/floorplate/svg_image/1/a.svg'
    asset = TourApi::Assets.svg(url, local_base: 'http://test.host')
    assert_equal [0.0, 0.0, 10.0, 10.0], asset.view_box
    assert_equal 20, asset.etag.length
    TourApi::Assets.svg(url, local_base: 'http://test.host')
    assert_equal [url], fetched, 'the second read is served from the cache'
    error = assert_raises(TourApi::Assets::Error) { TourApi::Assets.svg('https://evil.example.com/a.svg', local_base: 'http://test.host') }
    assert_equal 'svg_unavailable', error.code
    assert_equal [url], fetched, 'a disallowed host is never requested'
    TourApi::Assets.http = ->(_url) { [403, 'denied'] }
    error = assert_raises(TourApi::Assets::Error) { TourApi::Assets.svg('https://bucket.s3.amazonaws.com/uploads/x/b.svg', local_base: nil) }
    assert_equal 'svg_unavailable', error.code
    TourApi::Assets.http = ->(_url) { [200, '<html/>'] }
    error = assert_raises(TourApi::Assets::Error) { TourApi::Assets.svg('https://bucket.s3.amazonaws.com/uploads/x/c.svg', local_base: nil) }
    assert_equal 'invalid_svg', error.code
  end

  test 'an upload this host serves is read from public/' do
    dir = Rails.root.join('public/uploads/floorplate/svg_image/999999')
    FileUtils.mkdir_p(dir)
    File.write(dir.join('local.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5 5"/>')
    TourApi::Assets.http = ->(_url) { raise 'must not be requested' }
    asset = TourApi::Assets.svg('http://test.host/uploads/floorplate/svg_image/999999/local.svg', local_base: 'http://test.host')
    assert_equal [0.0, 0.0, 5.0, 5.0], asset.view_box
  ensure
    FileUtils.rm_rf(dir)
  end
end

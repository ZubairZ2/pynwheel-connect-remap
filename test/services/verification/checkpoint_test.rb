require 'test_helper'

# The reading of CheckpointID's answer (October 28, 2026): the legacy app's
# three fields and thresholds, and the two cases the legacy app let through
# that the server does not (an unknown error code, no face result).
class Verification::CheckpointTest < ActiveSupport::TestCase
  test 'a clean answer above both thresholds is verified' do
    out = Verification::Checkpoint.outcome('faceVerificationResult' => { 'antiSpoofing' => 93.2, 'confidence' => 71 })
    assert_equal 'verified', out[:outcome]
    assert_nil out[:reason]
  end

  test 'the legacy face and document error codes keep their reasons' do
    assert_equal ['face_mismatch', Verification::Checkpoint::FACE_REASON], Verification::Checkpoint.outcome('code' => 'MultipleErrors').values_at(:outcome, :reason)
    assert_equal ['face_mismatch', Verification::Checkpoint::FACE_REASON], Verification::Checkpoint.outcome('code' => 'ValidationError').values_at(:outcome, :reason)
    assert_equal ['document_unreadable', Verification::Checkpoint::DOCUMENT_REASON], Verification::Checkpoint.outcome('code' => 'MRZOCRError').values_at(:outcome, :reason)
    assert_equal ['document_unreadable', Verification::Checkpoint::DOCUMENT_REASON], Verification::Checkpoint.outcome('code' => 'MRZInNotPresentError').values_at(:outcome, :reason)
  end

  test 'a face below the anti-spoofing or confidence threshold is a mismatch' do
    assert_equal 'face_mismatch', Verification::Checkpoint.outcome('faceVerificationResult' => { 'antiSpoofing' => 79.9, 'confidence' => 90 })[:outcome]
    assert_equal 'face_mismatch', Verification::Checkpoint.outcome('faceVerificationResult' => { 'antiSpoofing' => 95, 'confidence' => 54 })[:outcome]
    assert_equal 'verified', Verification::Checkpoint.outcome('faceVerificationResult' => { 'antiSpoofing' => 80, 'confidence' => 55 })[:outcome]
  end

  test 'an unknown error code or a missing face result is never a pass' do
    out = Verification::Checkpoint.outcome('code' => 'ImageTooDark', 'message' => 'The image is too dark')
    assert_equal ['rejected', 'The image is too dark'], out.values_at(:outcome, :reason)
    assert_equal 'rejected', Verification::Checkpoint.outcome({})[:outcome]
    assert_equal 'rejected', Verification::Checkpoint.outcome('faceVerificationResult' => 'n/a')[:outcome]
  end

  test 'verify! refuses to run without the key and names the document types the legacy app offered' do
    ENV.stub(:[], ->(key) { key == 'CHECKPOINT_DVS_API_KEY' ? nil : nil }) do
      refute Verification::Checkpoint.configured?
      assert_raises(Verification::Checkpoint::Unavailable) { Verification::Checkpoint.verify!(document_type: 'passport', front: 'x', back: nil, selfie: 'y') }
    end
    assert_equal({ 'drivers_license' => 1, 'id_card' => 6, 'passport' => 2, 'passport_card' => 6, 'international_id' => 6 }, Verification::Checkpoint::DOCUMENT_TYPES.transform_values { |t| t[:code] })
  end
end

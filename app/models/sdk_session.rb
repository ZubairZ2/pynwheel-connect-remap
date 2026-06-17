class SdkSession < ApplicationRecord
  belongs_to :community

  # ── Journey scopes ────────────────────────────────────────────────────────
  # All analytics segments that belong to the same stable user identity UUID.
  scope :for_parent_session, ->(id) { where(parent_sdk_session_id: id) }

  # ── Lifecycle state helpers ───────────────────────────────────────────────
  def background_count = (events["map_session_background_state"] || 0)
  def active_count     = (events["map_session_active_state"]     || 0)
  def idle_count       = (events["map_session_idle_state"]       || 0)

  # ── Map interaction counters ──────────────────────────────────────────────
  def unit_marker_clicks     = (events["unit_marker_click"]    || 0)
  def amenity_marker_clicks  = (events["amenity_marker_click"] || 0)
  def unit_marker_hovers     = (events["unit_marker_hover"]    || 0)
  def amenity_marker_hovers  = (events["amenity_marker_hover"] || 0)

  # ── CTA counters ──────────────────────────────────────────────────────────
  def apply_click_counter       = (events["apply_now_click"]          || 0)
  def favorite_saved_counter    = (events["save_favorite_click"]      || 0)
  def favorite_sent_counter     = (events["sent_favorite_click"]      || 0)
  def favorite_deleted_counter  = (events["delete_favorite_click"]    || 0)
  def calculate_modal_counter   = (events["calculate_modal_open_click"] || 0)
  def tour_button_counter       = (events["tour_button_click"]        || 0)

  # ── Navigation counters ───────────────────────────────────────────────────
  def unit_card_clicks          = (events["unit_card_click"]          || 0)
  def floor_plan_card_clicks    = (events["floor_plan_card_click"]    || 0)
  def amenity_card_clicks       = (events["amenity_card_click"]       || 0)
  def gallery_view_count        = (events["gallery_view_click"]       || 0)
  def share_favorites_count     = (events["share_favorites_click"]    || 0)
  def view_favorites_count      = (events["view_favorites_view"]      || 0)

  # Per-channel share counters
  def share_email_count         = (events["share_email_click"]        || 0)
  def share_text_count          = (events["share_text_click"]         || 0)
  def share_whatsapp_count      = (events["share_whatsapp_click"]     || 0)
  def share_snapchat_count      = (events["share_snapchat_click"]     || 0)
  def share_copy_count          = (events["share_copy_click"]         || 0)
  def share_url                 = events["url"]

  # ── Aggregates ────────────────────────────────────────────────────────────
  def total_click_events = events.sum { |k, v| k.end_with?("_click") ? v.to_i : 0 }
  def total_hover_events = events.sum { |k, v| k.end_with?("_hover") ? v.to_i : 0 }
  def total_view_events  = events.sum { |k, v| k.end_with?("_view")  ? v.to_i : 0 }
end

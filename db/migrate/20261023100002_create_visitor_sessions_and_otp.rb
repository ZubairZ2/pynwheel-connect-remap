# frozen_string_literal: true

# The visitor (prospect) sign-in of the new Pynwheel Tour app (October 23,
# 2026): a phone number proven by a one-time code, then an opaque session
# token. Codes and tokens are stored only as digests. The code lives in its
# own row keyed by phone so a phone that has no visitor yet can be proven
# before the visitor is created, and so nothing touches the legacy
# `tour_users.pin_code` / ExpireOtpJob flow, which keeps working.
class CreateVisitorSessionsAndOtp < ActiveRecord::Migration[7.2]
  def change
    create_table :visitor_sessions do |t|
      t.integer :tour_user_id, null: false
      t.string :token_digest, null: false
      t.datetime :expires_at, precision: nil, null: false
      t.datetime :revoked_at, precision: nil
      t.datetime :last_used_at, precision: nil
      t.string :created_ip
      t.string :user_agent
      t.integer :community_id
      t.timestamps precision: nil
    end
    add_index :visitor_sessions, :token_digest, unique: true
    add_index :visitor_sessions, :tour_user_id

    create_table :visitor_otps do |t|
      t.string :phone_number, null: false
      t.string :code_digest, null: false
      t.datetime :expires_at, precision: nil, null: false
      t.integer :attempts, default: 0, null: false
      t.integer :sends_today, default: 0, null: false
      t.datetime :last_sent_at, precision: nil
      t.string :created_ip
      t.timestamps precision: nil
    end
    add_index :visitor_otps, :phone_number, unique: true
  end
end

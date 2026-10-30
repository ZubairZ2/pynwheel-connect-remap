--
-- PostgreSQL database dump
--

\restrict n4RbdbV7Trr5cbgrFk99dmXwy65Pxc4KHsCBR5MCHTB4bU89PiPPvfLkidUk0hb

-- Dumped from database version 16.15 (Homebrew)
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA public;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_stat_statements IS 'track execution statistics of all SQL statements executed';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: access_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.access_logs (
    id integer NOT NULL,
    lock_type character varying,
    url character varying,
    community_id integer,
    tour_user_id integer,
    is_resident boolean,
    stop_ids character varying[] DEFAULT '{}'::character varying[],
    payload jsonb,
    response jsonb,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: access_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.access_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: access_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.access_logs_id_seq OWNED BY public.access_logs.id;


--
-- Name: additional_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.additional_files (
    id integer NOT NULL,
    file character varying,
    name character varying,
    imagepage_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: additional_files_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.additional_files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: additional_files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.additional_files_id_seq OWNED BY public.additional_files.id;


--
-- Name: additional_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.additional_images (
    id integer NOT NULL,
    image character varying,
    sort integer,
    name character varying,
    imagepage_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    crop_x double precision,
    crop_y double precision,
    crop_w double precision,
    crop_h double precision,
    do_crop boolean DEFAULT false
);


--
-- Name: additional_images_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.additional_images_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: additional_images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.additional_images_id_seq OWNED BY public.additional_images.id;


--
-- Name: alert_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alert_messages (
    id integer NOT NULL,
    message_key character varying,
    message_body character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: alert_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.alert_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: alert_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.alert_messages_id_seq OWNED BY public.alert_messages.id;


--
-- Name: allowed_emails; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.allowed_emails (
    id integer NOT NULL,
    email character varying,
    community_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: allowed_emails_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.allowed_emails_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: allowed_emails_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.allowed_emails_id_seq OWNED BY public.allowed_emails.id;


--
-- Name: amenities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.amenities (
    id integer NOT NULL,
    provider_amenity_id character varying,
    amenty_type character varying,
    description text,
    unit_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    name character varying,
    image character varying,
    x_plot integer,
    y_plot integer,
    amenityable_type character varying,
    amenityable_id integer,
    community_id integer,
    standard_image_url character varying,
    sort integer,
    access_code character varying,
    directional_text character varying,
    floor integer,
    video_link character varying,
    video_link_button_label character varying DEFAULT 'PLAY VIDEO'::character varying,
    mass_upload_id character varying,
    building character varying,
    floorplan_amenity_id integer,
    crop_x double precision,
    crop_y double precision,
    crop_w double precision,
    crop_h double precision,
    do_crop boolean,
    breezway_lock_visible boolean DEFAULT true,
    lock_provider character varying DEFAULT ''::character varying,
    amenity_type character varying DEFAULT ''::character varying,
    tour_visiting_order_number integer,
    pointer_data jsonb DEFAULT '{}'::jsonb
);


--
-- Name: amenities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.amenities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: amenities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.amenities_id_seq OWNED BY public.amenities.id;


--
-- Name: amenity_galleries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.amenity_galleries (
    id integer NOT NULL,
    amenity_id integer,
    image character varying,
    description character varying,
    name character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    directional_text character varying,
    sort integer,
    associated_amenity_gallery_id integer
);


--
-- Name: amenity_galleries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.amenity_galleries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: amenity_galleries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.amenity_galleries_id_seq OWNED BY public.amenity_galleries.id;


--
-- Name: app_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_versions (
    id integer NOT NULL,
    version character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    neighborhood_counter integer,
    counter_limit integer DEFAULT 500,
    portico_version integer DEFAULT 1
);


--
-- Name: app_versions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.app_versions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: app_versions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.app_versions_id_seq OWNED BY public.app_versions.id;


--
-- Name: ar_internal_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ar_internal_metadata (
    key character varying NOT NULL,
    value character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: as_guests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.as_guests (
    id integer NOT NULL,
    community_id integer,
    guest_id character varying,
    edgestate_pin character varying,
    tour_user_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    dwelo_guest boolean DEFAULT false,
    pynwheel_access_user_id integer
);


--
-- Name: as_guests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.as_guests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: as_guests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.as_guests_id_seq OWNED BY public.as_guests.id;


--
-- Name: bedroom_marker_colors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bedroom_marker_colors (
    id bigint NOT NULL,
    community_id bigint NOT NULL,
    bedroom integer NOT NULL,
    available_units_color character varying DEFAULT '#f9d648'::character varying NOT NULL,
    available_units_opacity numeric(3,2) DEFAULT 1.0 NOT NULL,
    model_units_color character varying DEFAULT '#f57396'::character varying NOT NULL,
    model_units_opacity numeric(3,2) DEFAULT 1.0 NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: bedroom_marker_colors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bedroom_marker_colors_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bedroom_marker_colors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bedroom_marker_colors_id_seq OWNED BY public.bedroom_marker_colors.id;


--
-- Name: building_starting_points; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.building_starting_points (
    id integer NOT NULL,
    community_id integer,
    x_plot integer,
    y_plot integer,
    floor integer,
    name character varying,
    building character varying,
    image character varying,
    directional_text character varying,
    status character varying,
    access_code character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    lock_provider character varying DEFAULT ''::character varying
);


--
-- Name: building_starting_points_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.building_starting_points_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: building_starting_points_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.building_starting_points_id_seq OWNED BY public.building_starting_points.id;


--
-- Name: calculator_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calculator_configs (
    id bigint NOT NULL,
    community_id bigint NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    config_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    published_config_json jsonb,
    published_at timestamp(6) without time zone
);


--
-- Name: calculator_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.calculator_configs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: calculator_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.calculator_configs_id_seq OWNED BY public.calculator_configs.id;


--
-- Name: chatrooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chatrooms (
    id integer NOT NULL,
    tour_user_id integer,
    tour_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: chatrooms_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chatrooms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chatrooms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chatrooms_id_seq OWNED BY public.chatrooms.id;


--
-- Name: chats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chats (
    id integer NOT NULL,
    message character varying,
    name character varying,
    chatroom_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    client_date character varying,
    tour_key character varying
);


--
-- Name: chats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chats_id_seq OWNED BY public.chats.id;


--
-- Name: comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comments (
    id integer NOT NULL,
    commentable_id bigint,
    commentable_type character varying,
    content text,
    whodunit integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: comments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.comments_id_seq OWNED BY public.comments.id;


--
-- Name: communities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.communities (
    id integer NOT NULL,
    name character varying,
    logo character varying,
    address character varying,
    city character varying,
    state character varying,
    zip character varying,
    email character varying,
    phone character varying,
    description character varying,
    latitude numeric,
    longitude numeric,
    locked boolean,
    data_provider character varying,
    company_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    theme_name character varying,
    website character varying,
    code character varying,
    is_sitemap boolean DEFAULT true,
    secondary_logo character varying,
    show_gallery boolean DEFAULT true,
    gallery_page_name character varying DEFAULT 'Gallery'::character varying,
    show_apartment boolean DEFAULT true,
    apartment_page_name character varying DEFAULT 'Apartments'::character varying,
    equal_housing_opportunity_logo boolean DEFAULT true,
    handicap_accessible_logo boolean DEFAULT true,
    display_rent boolean DEFAULT true,
    display_sitemap boolean DEFAULT true,
    display_floorplan_gallery boolean DEFAULT true,
    display_unit_on_homepage boolean DEFAULT true,
    display_gallery_on_homepage boolean DEFAULT true,
    realpage_pricing_data character varying,
    realpage_pricing_data_uploaded boolean DEFAULT true,
    powered_by_btn boolean DEFAULT true,
    entrata_exception_logs character varying,
    is_vertical_app boolean DEFAULT false,
    show_tour_page boolean,
    display_available_date boolean DEFAULT true,
    show_gesture_icons boolean DEFAULT true,
    self_tour boolean DEFAULT false,
    floorplan_name_order boolean,
    community_group_id integer,
    crop_x double precision,
    crop_y double precision,
    crop_w double precision,
    crop_h double precision,
    crop_x_secondary double precision,
    crop_y_secondary double precision,
    crop_w_secondary double precision,
    crop_h_secondary double precision,
    image_bit boolean,
    do_crop boolean DEFAULT false,
    do_crop_secondary boolean DEFAULT false,
    alert_contact integer DEFAULT 2,
    number_of_units integer,
    tour_setup_visible boolean DEFAULT false,
    master_community boolean DEFAULT false,
    menu_button_shade character varying DEFAULT 'light'::character varying,
    sms_text text,
    email_text text,
    neighborhood_request_counter integer DEFAULT 0,
    neighborhood_request_counter_limit integer DEFAULT 300,
    limit_200_hit boolean DEFAULT false,
    limit_400_hit boolean DEFAULT false,
    show_property_map_key boolean DEFAULT true,
    show_property_map_key_text character varying DEFAULT 'Available Home'::character varying,
    show_amenity_key boolean DEFAULT true,
    show_amenity_key_text character varying DEFAULT 'Amenity Image'::character varying,
    billing_type character varying DEFAULT 'annual'::character varying,
    billing_month character varying DEFAULT ''::character varying,
    date_installed date,
    date_activated date,
    date_inactivated date,
    deleted_ids integer[] DEFAULT '{}'::integer[],
    touchscreen_app boolean DEFAULT true,
    lincoln_app boolean DEFAULT false,
    show_camera_button boolean DEFAULT true,
    show_notepad_button boolean DEFAULT true,
    automate_unit_stop boolean DEFAULT false,
    show_map boolean DEFAULT true,
    mdu boolean DEFAULT true,
    one_day_email_text character varying,
    one_hour_email_text character varying,
    self_tour_logo character varying,
    self_tour_logo_cropped boolean DEFAULT false,
    chat_control boolean DEFAULT false,
    is_chat_available boolean DEFAULT false,
    restrict_access boolean DEFAULT false,
    scheduler_widget boolean,
    pynwheel_touch boolean,
    thank_you_message character varying,
    apply_now_self_tour boolean DEFAULT true,
    apply_now_pynwheel_touch boolean DEFAULT true,
    apply_now_pynwheel_touch_and_go boolean DEFAULT true,
    arrive_too_early_alert character varying,
    arrive_too_late_alert character varying,
    unscheduled_alert character varying,
    unscheduled_alert_with_widget character varying,
    billing_rate_touch character varying DEFAULT '$2628'::character varying,
    billing_rate_selftour character varying DEFAULT '$385'::character varying,
    billing_rate_maps character varying DEFAULT '$29'::character varying,
    lincoln_billing_rate character varying DEFAULT '$295'::character varying,
    dwelo_billing_rate character varying DEFAULT '$280'::character varying,
    billing_rate_for_both character varying DEFAULT '$2413'::character varying,
    creator_id integer,
    locks_provider character varying,
    enable_locks boolean DEFAULT true,
    manual_lat_long boolean DEFAULT false,
    enable_community_id integer,
    multiple_locks_provider character varying[] DEFAULT '{}'::character varying[],
    region_id integer,
    pynwheel_access boolean DEFAULT false,
    web_map_type character varying DEFAULT '2d-map'::character varying,
    auto_wayfinding boolean DEFAULT false,
    community_logo boolean DEFAULT true,
    enable_three_d_maps boolean DEFAULT false,
    time_zone character varying DEFAULT 'UTC'::character varying,
    data_provider_updated_on character varying DEFAULT 'Never'::character varying,
    property_manager_name character varying,
    property_manager_email character varying,
    property_manager_phone character varying,
    brand_details_pdf character varying,
    product_options jsonb,
    move_to_production boolean DEFAULT true,
    display_pricing_options boolean DEFAULT true,
    pynwheel_launch_access boolean DEFAULT false,
    production_started_date date,
    released_date date,
    submitted_final_approval_date date,
    follow_up_email_date date,
    file character varying,
    display_building boolean DEFAULT false,
    email_logo character varying DEFAULT ''::character varying,
    show_amenity_name boolean DEFAULT true,
    sitemap_auto_zoom boolean DEFAULT false,
    use_company_level_data_settings boolean DEFAULT false,
    country_code character varying,
    pricing_message character varying DEFAULT 'Please see an agent for pricing details.'::character varying,
    units_availability_over_120_days boolean DEFAULT true,
    display_additional_fee boolean DEFAULT true,
    display_manual_additional_fee boolean DEFAULT false,
    additional_fee character varying DEFAULT ''::character varying,
    enable_svg_mode boolean DEFAULT false,
    display_tbd_legend boolean DEFAULT false,
    show_current_availability boolean DEFAULT false,
    is_floor_level_map boolean DEFAULT false,
    turn_availability_on boolean DEFAULT false,
    available_units_color character varying DEFAULT '#F9D648'::character varying NOT NULL,
    available_units_opacity numeric(3,2) DEFAULT 1.0 NOT NULL,
    model_units_color character varying DEFAULT '#F57396'::character varying NOT NULL,
    model_units_opacity numeric(3,2) DEFAULT 1.0 NOT NULL,
    amenities_color character varying DEFAULT '#d37474'::character varying NOT NULL,
    amenities_opacity numeric(3,2) DEFAULT 1.0 NOT NULL,
    coloring_mode integer DEFAULT 0 NOT NULL,
    is_beans_svg boolean DEFAULT false,
    background_svg_image character varying,
    map_logo character varying,
    enable_unit_type_pricing boolean DEFAULT false,
    enable_floorplan_level_color boolean DEFAULT false,
    default_map_floor integer,
    hide_bedrooms_bathrooms boolean DEFAULT false,
    enable_pricing_calculator boolean DEFAULT false NOT NULL,
    pricing_calculator_embed_code character varying,
    hide_square_feet boolean DEFAULT false,
    hide_availability boolean DEFAULT false,
    default_satellite_view boolean DEFAULT false,
    enable_sdk_map boolean DEFAULT false,
    enable_pynwheel_pricing_calculator boolean DEFAULT false NOT NULL,
    partner_map_settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    student_housing_property boolean DEFAULT false,
    highlight_all_units_on_hover boolean DEFAULT false,
    map_analytics_settings jsonb DEFAULT '{}'::jsonb,
    available_map_views character varying,
    default_map_view character varying
);


--
-- Name: communities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.communities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: communities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.communities_id_seq OWNED BY public.communities.id;


--
-- Name: community_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_groups (
    id integer NOT NULL,
    name character varying,
    address character varying,
    code character varying,
    page_type boolean DEFAULT false,
    page_name character varying,
    logo character varying,
    inactivate boolean DEFAULT false,
    company_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    menu_button_shade character varying DEFAULT 'light'::character varying,
    creator_id integer,
    region_id integer
);


--
-- Name: community_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.community_groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: community_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.community_groups_id_seq OWNED BY public.community_groups.id;


--
-- Name: community_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_users (
    id integer NOT NULL,
    community_id integer,
    user_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    enable_community_id integer,
    chat_enable boolean DEFAULT false,
    is_logged_in boolean DEFAULT false
);


--
-- Name: community_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.community_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: community_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.community_users_id_seq OWNED BY public.community_users.id;


--
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    id integer NOT NULL,
    name character varying,
    address character varying,
    city character varying,
    state character varying,
    zip character varying,
    email character varying,
    phone character varying,
    logo character varying,
    locked boolean,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    inactivate boolean DEFAULT false,
    creator_id integer,
    data_providers character varying[] DEFAULT '{}'::character varying[]
);


--
-- Name: companies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.companies_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.companies_id_seq OWNED BY public.companies.id;


--
-- Name: company_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_settings (
    id integer NOT NULL,
    company_level_data_import boolean DEFAULT false,
    company_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    pynwheel_launch_access boolean DEFAULT false
);


--
-- Name: company_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.company_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: company_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.company_settings_id_seq OWNED BY public.company_settings.id;


--
-- Name: credentials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credentials (
    id integer NOT NULL,
    community_id integer,
    password character varying,
    username character varying,
    property_id character varying,
    pmc_id character varying,
    licence_key character varying,
    server_name character varying,
    database character varying,
    platform character varying,
    interface_entity character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    url character varying,
    site_id character varying,
    c_code character varying,
    p_code character varying,
    apply_now character varying DEFAULT true,
    file character varying,
    api_token character varying,
    resman_apikey character varying,
    resman_partner_id character varying,
    resman_account_id character varying,
    resman_property_id character varying,
    zaremba_username character varying,
    zaremba_password character varying,
    zaremba_filename character varying,
    zaremba_property_id character varying,
    entrata_url character varying,
    xml_filename character varying,
    xml_domain character varying,
    data_error_message character varying,
    data_error_exp character varying,
    realpage_marketing_sources jsonb,
    limit_result boolean DEFAULT true,
    crm_provider character varying,
    crm_username character varying,
    crm_password character varying,
    crm_client_id character varying,
    crm_client_secret character varying,
    use_different_crm_provider boolean DEFAULT false,
    separate_link character varying,
    resman_api_version character varying DEFAULT 'GetMarketing4_0'::character varying,
    perq_property_id character varying,
    is_perq_allowed boolean DEFAULT false,
    entrata_available_units_only character varying DEFAULT '0'::character varying,
    entrata_show_unit_spaces character varying DEFAULT '1'::character varying,
    entrata_use_space_configuration character varying DEFAULT '1'::character varying,
    new_requested_data_provider character varying,
    yardi_rent_cafe_api_url character varying DEFAULT 'https://api.rentcafe.com'::character varying,
    currency character varying DEFAULT '840'::character varying,
    rentcafe_v2_auth_token character varying,
    rentcafe_v2_token_expires_at timestamp without time zone,
    company_id integer,
    rentcafe_api_version character varying DEFAULT 'Rentcafe V1'::character varying,
    yardi_username character varying,
    yardi_password character varying,
    rentmanager_username character varying DEFAULT ''::character varying,
    rentmanager_password character varying DEFAULT ''::character varying,
    rentmanager_property_id character varying DEFAULT ''::character varying,
    rentmanager_auth_token character varying DEFAULT ''::character varying,
    rentmanager_base_url character varying DEFAULT ''::character varying,
    allow_sub_communities boolean DEFAULT false,
    app_folio_property_id character varying DEFAULT ''::character varying,
    unit_name_key character varying DEFAULT 'MarketingTitle'::character varying NOT NULL,
    app_folio_database_id character varying,
    app_folio_property_scope character varying DEFAULT 'is_app_folio_property_id'::character varying NOT NULL,
    app_folio_property_group_id character varying,
    apartmentlist_url character varying
);


--
-- Name: credentials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.credentials_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: credentials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.credentials_id_seq OWNED BY public.credentials.id;


--
-- Name: crm_credentials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_credentials (
    id integer NOT NULL,
    crm_provider character varying,
    community_id integer,
    entrata_domain character varying,
    entrata_username character varying,
    entrata_password character varying,
    entrata_property_id character varying,
    realpage_site_id character varying,
    realpage_pmc_id character varying,
    rentcafe_c_code character varying,
    rentcafe_p_code character varying,
    rentcafe_domain character varying,
    salesforce_username character varying,
    salesforce_password character varying,
    salesforce_client_id character varying,
    salesforce_secret_id character varying,
    salesforce_grant_type character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    salesforce_property_id character varying,
    yardirentcafe_marketing_api_key character varying,
    yardirentcafe_property_id character varying,
    yardirentcafe_property_code character varying,
    knock_community_id character varying DEFAULT ''::character varying,
    funnel_api_key character varying DEFAULT ''::character varying,
    funnel_community_id character varying DEFAULT ''::character varying,
    knock_company_id character varying DEFAULT ''::character varying
);


--
-- Name: crm_credentials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.crm_credentials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: crm_credentials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.crm_credentials_id_seq OWNED BY public.crm_credentials.id;


--
-- Name: crm_discovery_sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_discovery_sources (
    id integer NOT NULL,
    sources jsonb,
    community_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: crm_discovery_sources_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.crm_discovery_sources_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: crm_discovery_sources_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.crm_discovery_sources_id_seq OWNED BY public.crm_discovery_sources.id;


--
-- Name: crm_time_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_time_slots (
    id integer NOT NULL,
    slots jsonb,
    community_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: crm_time_slots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.crm_time_slots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: crm_time_slots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.crm_time_slots_id_seq OWNED BY public.crm_time_slots.id;


--
-- Name: default_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.default_images (
    id integer NOT NULL,
    name character varying,
    image character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: default_images_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.default_images_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: default_images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.default_images_id_seq OWNED BY public.default_images.id;


--
-- Name: delayed_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delayed_jobs (
    id integer NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    handler text NOT NULL,
    last_error text,
    run_at timestamp without time zone,
    locked_at timestamp without time zone,
    failed_at timestamp without time zone,
    locked_by character varying,
    queue character varying,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: delayed_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.delayed_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: delayed_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.delayed_jobs_id_seq OWNED BY public.delayed_jobs.id;


--
-- Name: design_directions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.design_directions (
    id integer NOT NULL,
    image character varying,
    hex_colors character varying,
    direction character varying,
    additional_direction character varying,
    community_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    file character varying
);


--
-- Name: design_directions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.design_directions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: design_directions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.design_directions_id_seq OWNED BY public.design_directions.id;


--
-- Name: design_system_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.design_system_configs (
    id bigint NOT NULL,
    community_id bigint NOT NULL,
    config_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: design_system_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.design_system_configs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: design_system_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.design_system_configs_id_seq OWNED BY public.design_system_configs.id;


--
-- Name: designs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.designs (
    id integer NOT NULL,
    primary_color character varying,
    secondary_color character varying,
    primary_font_family character varying,
    primary_font_size character varying,
    primary_font_weight character varying,
    primary_text_align character varying,
    primary_font_color character varying,
    secondary_font_family character varying,
    secondary_font_size character varying,
    secondary_font_weight character varying,
    secondary_text_align character varying,
    secondary_font_color character varying,
    main_screen_background_color character varying,
    inner_screen_background_color character varying,
    community_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    loop_type character varying DEFAULT 'images'::character varying,
    logo_position character varying,
    secondary_logo_position character varying,
    secondary_page_background_image character varying,
    global_navigation_position character varying,
    animation character varying DEFAULT 'bouncing effects'::character varying,
    global_navigation_font_color character varying,
    global_navigation_background_color character varying,
    global_navigation_button_color character varying,
    global_navigation_buttons_opacity character varying,
    global_nav_bg_opacity character varying,
    button_shape character varying,
    global_nav_buttons_height character varying,
    global_nav_buttons_width character varying,
    secondary_page_menu_border character varying,
    global_nav_button_on character varying,
    global_nav_button_off character varying,
    buttons_as_image boolean DEFAULT false,
    filter_panel_color character varying,
    filter_panel_font_style character varying,
    filter_panel_font_color character varying,
    filter_button_color character varying,
    filter_button_font_style character varying,
    filter_button_font_color character varying,
    filter_panel_opacity character varying,
    filter_buttons_opacity character varying,
    gallery_buttons_opacity character varying,
    filter_menu_buttons_border character varying,
    gallery_buttons_border character varying,
    filter_button character varying,
    gallery_button character varying,
    filter_panel_background_image character varying,
    home_page_button_shape character varying,
    home_page_navigation_background_height character varying,
    home_page_buttons_height character varying,
    home_page_buttons_width character varying,
    home_page_buttons_opacity character varying,
    home_page_navigation_background_opacity character varying,
    home_page_buttons_border character varying,
    marker_background_color character varying,
    marker_style character varying,
    header_bg_color character varying,
    header_font_color character varying,
    details_bg_color character varying,
    details_font_color character varying,
    available_appartments_font_color character varying,
    available_appartments_bg_color character varying,
    floor_bg_color character varying,
    unit_header_bg_color character varying,
    unit_header_font_color character varying,
    unit_details_font_color character varying,
    unit_details_bg_color character varying,
    floorplan_name_bg_color character varying,
    floorplan_name_font_color character varying,
    unit_bg_color character varying,
    home_page_navigation_background_color character varying,
    home_page_navigation_button_color character varying,
    home_page_navigation_font_color character varying,
    filter_button_as_image boolean DEFAULT false,
    gallery_button_as_image boolean DEFAULT false,
    filter_panel_background_as_image boolean DEFAULT false,
    gallery_button_on_image character varying,
    gallery_button_on_as_image boolean DEFAULT false,
    global_nav_button_on_as_image boolean DEFAULT false,
    global_nav_button_off_as_image boolean DEFAULT false,
    unit_header_bg_color_opacity character varying,
    unit_details_bg_color_opacity character varying,
    floorplan_name_bg_color_opacity character varying,
    unit_bg_color_opacity character varying,
    header_bg_color_opacity character varying,
    details_bg_color_opacity character varying,
    available_appartments_bg_color_opacity character varying,
    floor_bg_color_opacity character varying,
    property_map_size character varying DEFAULT '30px'::character varying,
    property_map_color character varying DEFAULT '#d37474'::character varying,
    amenity_map_marker_size character varying DEFAULT '30px'::character varying,
    amenity_map_marker_color character varying DEFAULT '#ff0000'::character varying,
    modernist_map_marker_color character varying DEFAULT 'no color'::character varying,
    modernists_amenity_map_marker_color character varying DEFAULT 'no color'::character varying,
    property_map_size_integer integer DEFAULT 30,
    amenity_map_marker_size_integer integer DEFAULT 30,
    futurist_ebrochure_header_background_color character varying DEFAULT '#808080'::character varying,
    modernist_ebrochure_header_background_color character varying DEFAULT 'No color'::character varying,
    gables_ebrochure_header_background_color character varying DEFAULT '#808080'::character varying,
    panther_ebrochure_header_background_color character varying DEFAULT '#808080'::character varying,
    expressionist_ebrochure_header_background_color character varying DEFAULT 'No color'::character varying,
    display_ebrochure_header_background_color boolean DEFAULT false,
    ebrochure_email_message character varying DEFAULT 'Thank you for visiting <community_name>! Here are your favorites. Click on the images below to expand them.

We look forward to seeing you again soon. '::character varying,
    ebrochure_email_message_updated boolean DEFAULT false,
    futurist_property_map_marker_color character varying,
    expressionist_property_map_marker_color character varying,
    panther_property_map_marker_color character varying,
    futurist_amenity_map_marker_color character varying,
    expressionist__amenity_map_marker_color character varying,
    panther_amenity_map_marker_color character varying,
    futurist_property_map_size integer,
    expressionist_property_map_size integer,
    panther_property_map_size integer,
    modernist_property_map_size integer,
    futurist_amenity_map_size integer,
    expressionist_amenity_map_size integer,
    panther_amenity_map_size integer,
    modernist_amenity_map_size integer,
    futurist_unit_floorplan_map_marker_color character varying,
    expressionist_unit_floorplan_map_marker_color character varying,
    panther_unit_floorplan_map_marker_color character varying,
    gables_unit_floorplan_map_marker_color character varying,
    modernist_unit_floorplan_map_marker_color character varying,
    display_filter_label_image boolean,
    filter_label_image character varying,
    filter_panel_label_color character varying,
    filter_panel_label_opacity character varying,
    pynwheel_touch_hardware_spec character varying,
    property_map_occupied_color text DEFAULT '#f2f2f2'::text,
    property_map_occupied_on_notice_color text DEFAULT '#8545a1'::text,
    property_map_vacant_leased_color text DEFAULT '#f9d648'::text,
    property_map_model_color text DEFAULT '#f57396'::text,
    property_map_missing_color text DEFAULT '#eecea5'::text
);


--
-- Name: designs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.designs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: designs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.designs_id_seq OWNED BY public.designs.id;


--
-- Name: doors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.doors (
    id integer NOT NULL,
    name character varying,
    floor integer,
    x_plot integer DEFAULT 0,
    y_plot integer DEFAULT 0,
    lock_provider character varying DEFAULT ''::character varying,
    access_code character varying DEFAULT ''::character varying,
    community_id integer,
    attached_with_type character varying,
    attached_with_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    name_overrided boolean DEFAULT false,
    sort integer DEFAULT 1,
    note text
);


--
-- Name: doors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.doors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: doors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.doors_id_seq OWNED BY public.doors.id;


--
-- Name: dwelos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dwelos (
    id integer NOT NULL,
    client_id character varying,
    client_secret character varying,
    community_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    default_community_id character varying,
    api_url character varying DEFAULT 'https://api.dwelo.com'::character varying,
    lock_instruction_text character varying DEFAULT ''::character varying,
    lock_image character varying DEFAULT ''::character varying,
    amenity_lock_instruction_text character varying DEFAULT ''::character varying,
    amenity_lock_image character varying DEFAULT ''::character varying
);


--
-- Name: dwelos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dwelos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dwelos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dwelos_id_seq OWNED BY public.dwelos.id;


--
-- Name: ebrochure_menu_buttons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ebrochure_menu_buttons (
    id integer NOT NULL,
    name character varying,
    url text,
    favorite_setting_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: ebrochure_menu_buttons_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ebrochure_menu_buttons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ebrochure_menu_buttons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ebrochure_menu_buttons_id_seq OWNED BY public.ebrochure_menu_buttons.id;


--
-- Name: edge_states; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.edge_states (
    id integer NOT NULL,
    client_id character varying,
    client_secret character varying,
    community_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    refresh_token character varying,
    is_authorized_with_pynwheel boolean DEFAULT false,
    lock_instruction_text character varying DEFAULT ''::character varying,
    lock_image character varying DEFAULT ''::character varying,
    amenity_lock_instruction_text character varying DEFAULT ''::character varying,
    amenity_lock_image character varying DEFAULT ''::character varying
);


--
-- Name: edge_states_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.edge_states_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: edge_states_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.edge_states_id_seq OWNED BY public.edge_states.id;


--
-- Name: elevator_banks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.elevator_banks (
    id integer NOT NULL,
    name character varying,
    "position" character varying,
    lock_type character varying,
    lock_name character varying,
    lock_id character varying,
    elevator_id integer NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: elevator_banks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.elevator_banks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: elevator_banks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.elevator_banks_id_seq OWNED BY public.elevator_banks.id;


--
-- Name: elevator_galleries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.elevator_galleries (
    id integer NOT NULL,
    elevator_id integer,
    image character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    name character varying,
    description character varying DEFAULT ''::character varying,
    directional_text character varying DEFAULT ''::character varying
);


--
-- Name: elevator_galleries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.elevator_galleries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: elevator_galleries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.elevator_galleries_id_seq OWNED BY public.elevator_galleries.id;


--
-- Name: elevators; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.elevators (
    id integer NOT NULL,
    name character varying,
    description character varying,
    x_plot integer,
    y_plot integer,
    directional_text character varying,
    floorplate_id integer,
    community_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    image character varying,
    sitemap_id integer,
    floorplate_covering_range character varying,
    duplicate_of integer,
    building character varying,
    lock_provider character varying DEFAULT ''::character varying,
    access_code character varying,
    kind character varying DEFAULT 'elevator'::character varying NOT NULL,
    accessible boolean DEFAULT true NOT NULL,
    floor_positions jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: elevators_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.elevators_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: elevators_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.elevators_id_seq OWNED BY public.elevators.id;


--
-- Name: expressionists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expressionists (
    id integer NOT NULL,
    home_page_menu_position character varying,
    home_page_position_of_logo character varying,
    home_page_logo_size character varying,
    home_page_button_border_color character varying,
    display_home_page_button_icon boolean DEFAULT true,
    home_page_button_font_family character varying,
    home_page_button_font_size character varying,
    display_home_page_nav_background boolean DEFAULT true,
    home_page_button_image character varying,
    global_navigation_button_font_family character varying,
    global_navigation_button_font_size character varying,
    display_global_navigation_button_bg_color boolean DEFAULT true,
    filter_panel_button_border_color character varying,
    filter_panel_text_font_size character varying,
    filter_panel_button_text_font_size character varying,
    design_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    display_global_navigation_button_icon boolean DEFAULT true,
    display_home_page_image boolean DEFAULT false,
    global_navigation_button_border_color character varying,
    spacing_between_buttons character varying,
    button_on_bg_color character varying,
    display_button_on_bg_color boolean DEFAULT false,
    global_navigation_button_on_font_color character varying,
    application_background_image character varying,
    display_application_background_image boolean DEFAULT false,
    application_background_color character varying,
    display_apartment_nav_bg_image boolean DEFAULT false,
    apartment_nav_bg_image character varying,
    display_gallery_nav_bg_image boolean DEFAULT false,
    gallery_nav_bg_image character varying,
    display_favourities_nav_bg_image boolean DEFAULT false,
    favourities_nav_bg_image character varying,
    display_additional_pages_nav_bg_image boolean DEFAULT false,
    additional_pages_nav_bg_image character varying,
    button_on_bg_color_opacity character varying,
    application_background_color_opacity character varying,
    apartment_nav_bg_color character varying,
    gallery_nav_bg_color character varying,
    favourities_nav_bg_color character varying,
    additional_pages_nav_bg_color character varying,
    display_apartment_btn_on_image boolean DEFAULT false,
    apartment_btn_on_image character varying,
    display_gallery_btn_on_image boolean DEFAULT false,
    gallery_btn_on_image character varying,
    display_neighborhood_btn_on_image boolean DEFAULT false,
    neighborhood_btn_on_image character varying,
    display_imagepage_btn_on_image boolean DEFAULT false,
    imagepage_btn_on_image character varying,
    display_webpage_btn_on_image boolean DEFAULT false,
    webpage_btn_on_image character varying,
    display_favourite_btn_on_image boolean DEFAULT false,
    favourite_btn_on_image character varying,
    display_apartment_btn_off_image boolean DEFAULT false,
    apartment_btn_off_image character varying,
    display_gallery_btn_off_image boolean DEFAULT false,
    gallery_btn_off_image character varying,
    display_neighborhood_btn_off_image boolean DEFAULT false,
    neighborhood_btn_off_image character varying,
    display_imagepage_btn_off_image boolean DEFAULT false,
    imagepage_btn_off_image character varying,
    display_webpage_btn_off_image boolean DEFAULT false,
    webpage_btn_off_image character varying,
    display_favourite_btn_off_image boolean DEFAULT false,
    favourite_btn_off_image character varying,
    global_navigation_btn_on_for_all boolean DEFAULT false,
    global_navigation_btn_off_for_all boolean DEFAULT false,
    display_global_nav_background_image boolean DEFAULT false,
    global_nav_background_image character varying,
    home_page_background_image character varying,
    display_home_page_nav_background_image boolean DEFAULT false,
    spacing_between_buttons_for_homepage character varying,
    global_navigation_border_thickness character varying,
    home_page_logo_visible boolean DEFAULT false,
    gables_home_page_images boolean DEFAULT false,
    global_navigation_text_outside_the_button_border boolean DEFAULT false,
    use_gables_buttons boolean DEFAULT false,
    home_page_icons_position character varying,
    global_navigation_icons_position character varying DEFAULT 'Above the text'::character varying,
    global_navigation_show_background_color boolean DEFAULT true,
    button_text_position character varying,
    display_global_navigation_button_color boolean DEFAULT false,
    homepage_button_border_thickness character varying,
    global_navigation_home_icon boolean DEFAULT false,
    homepage_button_border character varying,
    global_nav_button_icon_size character varying,
    display_neighborhood_bg_image boolean,
    neighborhood_bg_image character varying,
    overlay_text character varying,
    overlay_font character varying,
    overlay_size character varying,
    overlay_color character varying,
    overlay_opacity character varying,
    overlay_text_position character varying
);


--
-- Name: expressionists_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.expressionists_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: expressionists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.expressionists_id_seq OWNED BY public.expressionists.id;


--
-- Name: favorite_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favorite_images (
    id integer NOT NULL,
    image character varying,
    favorite_setting_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    name character varying,
    sort integer
);


--
-- Name: favorite_images_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.favorite_images_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: favorite_images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.favorite_images_id_seq OWNED BY public.favorite_images.id;


--
-- Name: favorite_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favorite_settings (
    id integer NOT NULL,
    community_id integer,
    email_from character varying,
    email_bcc character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    email_body character varying DEFAULT 'Thank you for visiting <community_name>! Here are your favorites. Click on the images below to expand them.

We look forward to seeing you again soon.'::character varying,
    show_favorite boolean DEFAULT true,
    favorite_name character varying DEFAULT 'Favorites'::character varying,
    equal_housing_opportunity_logo boolean DEFAULT true,
    handicap_accessible_logo boolean DEFAULT true
);


--
-- Name: favorite_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.favorite_settings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: favorite_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.favorite_settings_id_seq OWNED BY public.favorite_settings.id;


--
-- Name: favorite_stops; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favorite_stops (
    id integer NOT NULL,
    favorite_unit text[] DEFAULT '{}'::text[],
    favorite_amenity text[] DEFAULT '{}'::text[],
    community_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    user_favorites_unit json DEFAULT '{}'::json,
    user_favorites_amenity json DEFAULT '{}'::json
);


--
-- Name: favorite_stops_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.favorite_stops_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: favorite_stops_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.favorite_stops_id_seq OWNED BY public.favorite_stops.id;


--
-- Name: favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favorites (
    id integer NOT NULL,
    community_id integer,
    session_id character varying,
    unit_ids jsonb,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    amenity_ids jsonb DEFAULT '[]'::jsonb,
    floorplan_ids jsonb DEFAULT '[]'::jsonb,
    gallery_image_ids jsonb DEFAULT '[]'::jsonb
);


--
-- Name: favorites_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.favorites_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: favorites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.favorites_id_seq OWNED BY public.favorites.id;


--
-- Name: feedbacks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedbacks (
    id integer NOT NULL,
    rating double precision,
    comment text,
    is_cancelled boolean,
    cancelled_at timestamp without time zone,
    tour_user_id integer,
    tour_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: feedbacks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.feedbacks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: feedbacks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.feedbacks_id_seq OWNED BY public.feedbacks.id;


--
-- Name: filter_panels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.filter_panels (
    id integer NOT NULL,
    button_border_color character varying,
    text_font_size character varying,
    button_text_font_size character varying,
    design_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    gallery_button_on_font_color character varying,
    display_gallery_button_on_background_color boolean DEFAULT false,
    gallery_button_on_background_color character varying,
    display_filter_panel_icon boolean DEFAULT true,
    filter_panel_icon_color character varying,
    icon_background_color character varying,
    icon_background_color_opacity character varying,
    gallery_button_on_background_color_opacity character varying,
    filter_buttons_icons_position character varying DEFAULT 'Right of text'::character varying,
    filter_panel_buttons_show_backround_color boolean DEFAULT true
);


--
-- Name: filter_panels_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.filter_panels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: filter_panels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.filter_panels_id_seq OWNED BY public.filter_panels.id;


--
-- Name: floorplans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.floorplans (
    id integer NOT NULL,
    community_id integer,
    provider character varying,
    property_id character varying,
    provider_floorplan_id character varying,
    name character varying,
    unit_count integer,
    units_available integer,
    bedrooms character varying,
    bathrooms double precision,
    market_rent double precision,
    square_feet double precision,
    deposit double precision,
    comment text,
    description text,
    availability_url character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    image character varying,
    virtual_tour_url character varying,
    standard_image_url character varying,
    updated_by_admin boolean DEFAULT false,
    manual_override boolean DEFAULT false,
    secondary_image character varying,
    name_is_updated boolean,
    square_feet_is_updated boolean,
    bedroom_is_updated boolean,
    bathroom_is_updated boolean,
    market_rent_is_updated boolean,
    display_virtual_tour_button_label boolean DEFAULT false,
    virtual_tour_button_label character varying DEFAULT '3D Tour'::character varying,
    crop_x double precision,
    crop_y double precision,
    crop_w double precision,
    crop_h double precision,
    crop_x_secondary double precision,
    crop_y_secondary double precision,
    crop_w_secondary double precision,
    crop_h_secondary double precision,
    image_bit boolean,
    do_crop boolean DEFAULT false,
    do_crop_secondary boolean DEFAULT false,
    "iframe_enable_for_3Dtour" boolean DEFAULT true,
    file character varying,
    additional_button character varying,
    additional_url character varying,
    scheduler_label character varying,
    scheduler_url character varying,
    available_units_color character varying DEFAULT '#f9d648'::character varying NOT NULL,
    available_units_opacity numeric(3,2) DEFAULT 1.0 NOT NULL,
    model_units_color character varying DEFAULT '#f57396'::character varying NOT NULL,
    model_units_opacity numeric(3,2) DEFAULT 1.0 NOT NULL,
    availability_status integer DEFAULT 0 NOT NULL,
    link1_open_new_tab boolean DEFAULT false,
    link2_open_new_tab boolean DEFAULT false,
    link3_open_new_tab boolean DEFAULT false,
    description_title character varying DEFAULT 'More Details'::character varying,
    show_description_on_card boolean DEFAULT false,
    expand_description_in_popup boolean DEFAULT false
);


--
-- Name: floorplans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.floorplans_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: floorplans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.floorplans_id_seq OWNED BY public.floorplans.id;


--
-- Name: floorplates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.floorplates (
    id integer NOT NULL,
    name character varying,
    number integer,
    building character varying,
    range character varying,
    image character varying,
    community_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    standard_image_url character varying,
    svg_image_url character varying,
    height double precision,
    width double precision,
    floor_name character varying,
    floor_name_added boolean DEFAULT false,
    name_is_updated boolean,
    building_is_updated boolean,
    manual_override boolean DEFAULT false,
    map_ocr_data jsonb,
    is_ocr_enabled boolean DEFAULT false,
    label_image character varying,
    file character varying,
    svg_image character varying,
    svg_metadata jsonb DEFAULT '{}'::jsonb,
    wayfinding_version integer DEFAULT 0 NOT NULL,
    svg_to_image_transform jsonb,
    scale_ft_per_px numeric(10,6)
);


--
-- Name: floorplates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.floorplates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: floorplates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.floorplates_id_seq OWNED BY public.floorplates.id;


--
-- Name: font_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.font_settings (
    id bigint NOT NULL,
    community_id bigint NOT NULL,
    svg_labels_font_family character varying,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: font_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.font_settings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: font_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.font_settings_id_seq OWNED BY public.font_settings.id;


--
-- Name: gables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gables (
    id integer NOT NULL,
    hide_tagline boolean DEFAULT true,
    appartment_button_color character varying,
    gallery_button_color character varying,
    neighborhood_button_color character varying,
    favorite_button_color character varying,
    filter_panel_color character varying,
    design_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    webpages_button_color character varying,
    imagepages_button_color character varying,
    home_page_nav_bg_image character varying,
    display_home_page_nav_bg_image_button boolean DEFAULT false,
    global_nav_bg_image character varying,
    display_global_nav_bg_image_button boolean DEFAULT false,
    filter_panel_bg_image character varying,
    display_filter_panel_bg_image_button boolean DEFAULT false,
    filter_panel_text_color character varying,
    filter_panel_opacity character varying,
    application_bg_image_gables character varying,
    apartment_bg_image_gables character varying,
    gallery_bg_image_gables character varying,
    favourite_bg_image_gables character varying,
    additional_pages_bg_image_gables character varying,
    display_application_bg_image_gables boolean,
    display_apartment_bg_image_gables boolean,
    display_gallery_bg_image_gables boolean,
    display_favourite_bg_image_gables boolean,
    display_additional_pages_bg_image_gables boolean
);


--
-- Name: gables_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gables_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gables_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gables_id_seq OWNED BY public.gables.id;


--
-- Name: galleries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.galleries (
    id integer NOT NULL,
    name character varying,
    community_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    sort integer,
    is_default boolean DEFAULT false
);


--
-- Name: galleries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.galleries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: galleries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.galleries_id_seq OWNED BY public.galleries.id;


--
-- Name: gallery_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gallery_images (
    id integer NOT NULL,
    image character varying,
    crop_x double precision,
    crop_y double precision,
    crop_w double precision,
    crop_h double precision,
    sort integer,
    community_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    gallery_id integer,
    name character varying,
    standard_image_url character varying,
    ios_image_url character varying,
    large_image_url character varying,
    video character varying,
    do_crop boolean DEFAULT false
);


--
-- Name: gallery_images_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gallery_images_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gallery_images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gallery_images_id_seq OWNED BY public.gallery_images.id;


--
-- Name: group_designs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_designs (
    id integer NOT NULL,
    logo_position character varying,
    button_shape character varying,
    button_width character varying,
    button_height character varying,
    button_spacing character varying,
    background_image character varying,
    button_color character varying,
    button_opacity character varying,
    button_border_side character varying,
    button_border_color character varying,
    button_border_opacity character varying,
    button_border_thickness character varying,
    button_font_family character varying,
    button_font_size character varying,
    button_font_color character varying,
    community_group_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    bouncing_effecting character varying,
    video character varying,
    loop_type character varying DEFAULT 'images'::character varying,
    logo_size character varying,
    display_button_image boolean DEFAULT false,
    display_button_text boolean DEFAULT true
);


--
-- Name: group_designs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.group_designs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: group_designs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.group_designs_id_seq OWNED BY public.group_designs.id;


--
-- Name: group_homepage_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_homepage_images (
    id integer NOT NULL,
    image character varying,
    name character varying,
    is_small boolean,
    crop_x double precision,
    crop_y double precision,
    crop_w double precision,
    crop_h double precision,
    group_design_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: group_homepage_images_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.group_homepage_images_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: group_homepage_images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.group_homepage_images_id_seq OWNED BY public.group_homepage_images.id;


--
-- Name: group_homepage_videos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_homepage_videos (
    id integer NOT NULL,
    video character varying,
    group_design_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: group_homepage_videos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.group_homepage_videos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: group_homepage_videos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.group_homepage_videos_id_seq OWNED BY public.group_homepage_videos.id;


--
-- Name: guided_opening_hours; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guided_opening_hours (
    id integer NOT NULL,
    day character varying,
    opening_time character varying,
    closing_time character varying,
    community_id integer,
    sort integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: guided_opening_hours_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.guided_opening_hours_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: guided_opening_hours_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.guided_opening_hours_id_seq OWNED BY public.guided_opening_hours.id;


--
-- Name: hallway_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hallway_attachments (
    id bigint NOT NULL,
    attachable_type character varying NOT NULL,
    attachable_id integer NOT NULL,
    parent_type character varying NOT NULL,
    parent_id integer NOT NULL,
    community_id integer,
    hallway_id integer,
    mode character varying DEFAULT 'explicit'::character varying NOT NULL,
    anchor_x double precision,
    anchor_y double precision,
    space character varying DEFAULT 'raster'::character varying NOT NULL,
    created_by_user_id integer,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    CONSTRAINT hallway_attachments_mode_consistency CHECK (((((mode)::text = 'detached'::text) AND (hallway_id IS NULL)) OR (((mode)::text = 'explicit'::text) AND (hallway_id IS NOT NULL))))
);


--
-- Name: hallway_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hallway_attachments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hallway_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hallway_attachments_id_seq OWNED BY public.hallway_attachments.id;


--
-- Name: hallway_detection_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hallway_detection_runs (
    id bigint NOT NULL,
    community_id integer NOT NULL,
    parent_type character varying NOT NULL,
    parent_id integer NOT NULL,
    client_request_id character varying NOT NULL,
    status character varying DEFAULT 'applied'::character varying NOT NULL,
    scope character varying,
    detector_source character varying,
    space character varying DEFAULT 'raster'::character varying NOT NULL,
    nodes_added integer DEFAULT 0 NOT NULL,
    edges_added integer DEFAULT 0 NOT NULL,
    nodes_skipped integer DEFAULT 0 NOT NULL,
    edges_skipped integer DEFAULT 0 NOT NULL,
    result jsonb DEFAULT '{}'::jsonb NOT NULL,
    triggered_by_user_id integer,
    undone_at timestamp(6) without time zone,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: hallway_detection_runs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hallway_detection_runs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hallway_detection_runs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hallway_detection_runs_id_seq OWNED BY public.hallway_detection_runs.id;


--
-- Name: hallway_edges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hallway_edges (
    id bigint NOT NULL,
    from_hallway_id integer NOT NULL,
    to_hallway_id integer NOT NULL,
    parent_type character varying NOT NULL,
    parent_id integer NOT NULL,
    community_id integer,
    kind character varying DEFAULT 'manual'::character varying NOT NULL,
    path_points jsonb DEFAULT '[]'::jsonb NOT NULL,
    review_status character varying DEFAULT 'confirmed'::character varying NOT NULL,
    auto_generated boolean DEFAULT false NOT NULL,
    detection_run_id bigint,
    space character varying DEFAULT 'raster'::character varying NOT NULL,
    created_by_user_id integer,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    CONSTRAINT hallway_edges_canonical_pair CHECK ((from_hallway_id < to_hallway_id))
);


--
-- Name: hallway_edges_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hallway_edges_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hallway_edges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hallway_edges_id_seq OWNED BY public.hallway_edges.id;


--
-- Name: hallway_suppressions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hallway_suppressions (
    id bigint NOT NULL,
    parent_type character varying NOT NULL,
    parent_id integer NOT NULL,
    community_id integer,
    kind character varying NOT NULL,
    space character varying DEFAULT 'raster'::character varying NOT NULL,
    x1 double precision NOT NULL,
    y1 double precision NOT NULL,
    x2 double precision,
    y2 double precision,
    hallway_a_id integer,
    hallway_b_id integer,
    removed_source character varying,
    removed_kind character varying,
    reason character varying DEFAULT 'user_delete'::character varying NOT NULL,
    removed_by_user_id integer,
    created_at timestamp(6) without time zone NOT NULL
);


--
-- Name: hallway_suppressions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hallway_suppressions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hallway_suppressions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hallway_suppressions_id_seq OWNED BY public.hallway_suppressions.id;


--
-- Name: hallways; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hallways (
    id integer NOT NULL,
    x_plot double precision,
    y_plot double precision,
    parent_type character varying,
    parent_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    next_points integer[] DEFAULT '{}'::integer[],
    selected boolean,
    source character varying DEFAULT 'manual'::character varying NOT NULL,
    review_status character varying DEFAULT 'confirmed'::character varying NOT NULL,
    confidence double precision,
    space character varying DEFAULT 'raster'::character varying NOT NULL,
    community_id integer,
    detection_run_id bigint,
    confirmed_at timestamp(6) without time zone,
    created_by_user_id integer
);


--
-- Name: hallways_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hallways_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hallways_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hallways_id_seq OWNED BY public.hallways.id;


--
-- Name: hardware_specs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hardware_specs (
    id integer NOT NULL,
    name character varying,
    phone character varying,
    image character varying,
    community_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: hardware_specs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hardware_specs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hardware_specs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hardware_specs_id_seq OWNED BY public.hardware_specs.id;


--
-- Name: home_page_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.home_page_images (
    id integer NOT NULL,
    image character varying,
    name character varying,
    design_id integer,
    crop_x double precision,
    crop_y double precision,
    crop_w double precision,
    crop_h double precision,
    sort integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    standard_image_url character varying,
    thumb_image_url character varying,
    large_image_url character varying,
    do_crop boolean DEFAULT false,
    is_small boolean DEFAULT false
);


--
-- Name: home_page_images_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.home_page_images_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: home_page_images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.home_page_images_id_seq OWNED BY public.home_page_images.id;


--
-- Name: home_page_videos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.home_page_videos (
    id integer NOT NULL,
    video character varying,
    name character varying,
    design_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: home_page_videos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.home_page_videos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: home_page_videos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.home_page_videos_id_seq OWNED BY public.home_page_videos.id;


--
-- Name: home_screens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.home_screens (
    id integer NOT NULL,
    appartments_button character varying,
    galleries_button character varying,
    neighborhood_button character varying,
    favorities_button character varying,
    menu_position character varying,
    manage_background boolean,
    background_color character varying,
    design_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    about_button character varying,
    floorplan_button character varying,
    building_button character varying
);


--
-- Name: home_screens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.home_screens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: home_screens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.home_screens_id_seq OWNED BY public.home_screens.id;


--
-- Name: homepage_icons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.homepage_icons (
    id integer NOT NULL,
    image character varying,
    name character varying,
    sort integer,
    design_id integer,
    crop_x double precision,
    crop_y double precision,
    crop_w double precision,
    crop_h double precision,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: homepage_icons_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.homepage_icons_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: homepage_icons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.homepage_icons_id_seq OWNED BY public.homepage_icons.id;


--
-- Name: igloo_guests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.igloo_guests (
    id integer NOT NULL,
    guest_type character varying,
    guest_code character varying,
    guest_id character varying,
    status character varying,
    community_id integer,
    tour_user_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    stop_id integer,
    pynwheel_access_user_id integer
);


--
-- Name: igloo_guests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.igloo_guests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: igloo_guests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.igloo_guests_id_seq OWNED BY public.igloo_guests.id;


--
-- Name: igloohome_guests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.igloohome_guests (
    id integer NOT NULL,
    guest_pin character varying,
    community_id integer,
    tour_user_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    stop_id character varying,
    stop_type character varying,
    guest_bluetooth_key character varying,
    guest_key character varying,
    guest_of_stop_type character varying,
    guest_of_stop_id integer
);


--
-- Name: igloohome_guests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.igloohome_guests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: igloohome_guests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.igloohome_guests_id_seq OWNED BY public.igloohome_guests.id;


--
-- Name: igloohome_locks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.igloohome_locks (
    id integer NOT NULL,
    device_name character varying,
    device_id character varying,
    stop_type character varying,
    stop_id integer,
    igloohome_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: igloohome_locks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.igloohome_locks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: igloohome_locks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.igloohome_locks_id_seq OWNED BY public.igloohome_locks.id;


--
-- Name: igloohomes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.igloohomes (
    id integer NOT NULL,
    username character varying,
    password character varying,
    community_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    email character varying,
    file character varying,
    lock_instruction_text character varying DEFAULT ''::character varying,
    lock_image character varying DEFAULT ''::character varying,
    is_authorized_with_pynwheel boolean DEFAULT false,
    client_id character varying,
    client_secret character varying,
    refresh_token character varying,
    access_token character varying,
    access_token_expiry timestamp without time zone,
    refresh_token_expiry timestamp without time zone,
    version character varying DEFAULT 'v1'::character varying,
    home_name character varying,
    amenity_lock_instruction_text character varying DEFAULT ''::character varying,
    amenity_lock_image character varying DEFAULT ''::character varying,
    iglooworks_api_key character varying DEFAULT ''::character varying,
    iglooworks_department_id character varying DEFAULT ''::character varying
);


--
-- Name: igloohomes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.igloohomes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: igloohomes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.igloohomes_id_seq OWNED BY public.igloohomes.id;


--
-- Name: imagepages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.imagepages (
    id integer NOT NULL,
    name character varying,
    is_slideshow boolean,
    community_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    hide_page boolean DEFAULT false,
    display_on_homepage boolean DEFAULT false,
    "position" integer,
    sort integer
);


--
-- Name: imagepages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.imagepages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: imagepages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.imagepages_id_seq OWNED BY public.imagepages.id;


--
-- Name: impressions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.impressions (
    id integer NOT NULL,
    request_id character varying,
    in_request json DEFAULT '{}'::json,
    out_response json DEFAULT '{}'::json,
    enabled boolean DEFAULT false,
    name_space character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: impressions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.impressions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: impressions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.impressions_id_seq OWNED BY public.impressions.id;


--
-- Name: latch_allowed_accesses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.latch_allowed_accesses (
    id integer NOT NULL,
    doorcode character varying,
    doorcode_type character varying,
    stop_type character varying,
    stop_id integer,
    latch_guest_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: latch_allowed_accesses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.latch_allowed_accesses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: latch_allowed_accesses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.latch_allowed_accesses_id_seq OWNED BY public.latch_allowed_accesses.id;


--
-- Name: latch_auth_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.latch_auth_tokens (
    id integer NOT NULL,
    tour_user_id integer NOT NULL,
    token character varying,
    expires_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: latch_auth_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.latch_auth_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: latch_auth_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.latch_auth_tokens_id_seq OWNED BY public.latch_auth_tokens.id;


--
-- Name: latch_guests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.latch_guests (
    id integer NOT NULL,
    community_id integer,
    tour_user_id integer,
    latch_link character varying,
    reservation_token character varying,
    start_time integer,
    end_time integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    status character varying,
    guest_of_stop_type character varying,
    guest_of_stop_id integer,
    pynwheel_access_user_id integer
);


--
-- Name: latch_guests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.latch_guests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: latch_guests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.latch_guests_id_seq OWNED BY public.latch_guests.id;


--
-- Name: latch_locks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.latch_locks (
    id integer NOT NULL,
    lock_id character varying,
    stop_type character varying,
    stop_id integer,
    latch_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    lock_name character varying,
    door_uuid character varying
);


--
-- Name: latch_locks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.latch_locks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: latch_locks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.latch_locks_id_seq OWNED BY public.latch_locks.id;


--
-- Name: latches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.latches (
    id integer NOT NULL,
    client_id character varying,
    client_secret character varying,
    community_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    file character varying,
    lock_instruction_text character varying DEFAULT ''::character varying,
    lock_image character varying DEFAULT ''::character varying,
    passwordless_client_id character varying DEFAULT ''::character varying,
    passwordless_client_secret character varying DEFAULT ''::character varying,
    latch_property_name character varying DEFAULT ''::character varying,
    is_building_name_added boolean DEFAULT false,
    is_integration_submitted boolean DEFAULT false,
    is_mission_control_setup boolean DEFAULT false,
    amenity_lock_instruction_text character varying DEFAULT ''::character varying,
    amenity_lock_image character varying DEFAULT ''::character varying
);


--
-- Name: latches_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.latches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: latches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.latches_id_seq OWNED BY public.latches.id;


--
-- Name: launch_remotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.launch_remotes (
    id integer NOT NULL,
    community_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: launch_remotes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.launch_remotes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: launch_remotes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.launch_remotes_id_seq OWNED BY public.launch_remotes.id;


--
-- Name: locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.locations (
    id integer NOT NULL,
    address character varying,
    latitude numeric,
    longitude numeric,
    category character varying,
    title character varying,
    neighborhood_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    image character varying,
    standard_image_url character varying,
    distance double precision,
    "time" character varying,
    rating double precision
);


--
-- Name: locations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.locations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.locations_id_seq OWNED BY public.locations.id;


--
-- Name: lock_histories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lock_histories (
    id integer NOT NULL,
    event character varying,
    occured_at timestamp without time zone,
    stop_id integer,
    stop_name character varying,
    stop_type character varying,
    tour_user_id integer,
    tour_history_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: lock_histories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lock_histories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lock_histories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lock_histories_id_seq OWNED BY public.lock_histories.id;


--
-- Name: main_screens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.main_screens (
    id integer NOT NULL,
    appartments_button character varying,
    galleries_button character varying,
    neighborhood_button character varying,
    favorities_button character varying,
    menu_position character varying,
    manage_background boolean,
    background_color character varying,
    design_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: main_screens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.main_screens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: main_screens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.main_screens_id_seq OWNED BY public.main_screens.id;


--
-- Name: map_filters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.map_filters (
    id bigint NOT NULL,
    community_id bigint NOT NULL,
    marketing_properties_enabled boolean DEFAULT true NOT NULL,
    marketing_bedrooms_enabled boolean DEFAULT true NOT NULL,
    marketing_pricing_enabled boolean DEFAULT true NOT NULL,
    marketing_square_feet_enabled boolean DEFAULT true NOT NULL,
    marketing_availability_enabled boolean DEFAULT true NOT NULL,
    ops_properties_enabled boolean DEFAULT true NOT NULL,
    ops_bedrooms_enabled boolean DEFAULT true NOT NULL,
    ops_pricing_enabled boolean DEFAULT true NOT NULL,
    ops_square_feet_enabled boolean DEFAULT true NOT NULL,
    ops_availability_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    marketing_units_tab_enabled boolean DEFAULT true NOT NULL,
    marketing_floorplans_tab_enabled boolean DEFAULT true NOT NULL,
    marketing_amenities_tab_enabled boolean DEFAULT true NOT NULL,
    marketing_favorites_tab_enabled boolean DEFAULT true NOT NULL,
    ops_units_tab_enabled boolean DEFAULT true NOT NULL,
    ops_floorplans_tab_enabled boolean DEFAULT true NOT NULL,
    ops_amenities_tab_enabled boolean DEFAULT true NOT NULL,
    ops_favorites_tab_enabled boolean DEFAULT true NOT NULL,
    marketing_sort_enabled boolean DEFAULT true,
    ops_sort_enabled boolean DEFAULT true,
    marketing_floorplan_gallery_page_enabled boolean DEFAULT true,
    ops_floorplan_gallery_page_enabled boolean DEFAULT true
);


--
-- Name: map_filters_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.map_filters_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: map_filters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.map_filters_id_seq OWNED BY public.map_filters.id;


--
-- Name: map_partners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.map_partners (
    id integer NOT NULL,
    community_id integer NOT NULL,
    partner character varying NOT NULL,
    api_key character varying NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: map_partners_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.map_partners_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: map_partners_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.map_partners_id_seq OWNED BY public.map_partners.id;


--
-- Name: maps_positions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maps_positions (
    id integer NOT NULL,
    community_id integer,
    sitemap_id integer,
    floorplate_id integer,
    center_coords double precision[] DEFAULT '{}'::double precision[],
    upward_dist double precision,
    right_dist double precision,
    rotation double precision,
    zoom double precision DEFAULT 18.0,
    opacity double precision DEFAULT 0.5,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: maps_positions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.maps_positions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: maps_positions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.maps_positions_id_seq OWNED BY public.maps_positions.id;


--
-- Name: menus; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menus (
    id integer NOT NULL,
    "position" character varying,
    button_style character varying,
    border_radius character varying,
    border_width character varying,
    border_color character varying,
    button_background_color character varying,
    button_hover_color character varying,
    manage_background boolean DEFAULT false,
    background_color character varying,
    design_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    background_opacity double precision,
    vertical_menu_position character varying,
    horizontal_menu_position character varying,
    navigation_text_color character varying,
    navigation_background_color character varying
);


--
-- Name: menus_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.menus_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: menus_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.menus_id_seq OWNED BY public.menus.id;


--
-- Name: neighborhoods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.neighborhoods (
    id integer NOT NULL,
    community_id integer,
    address character varying,
    latitude numeric,
    longitude numeric,
    radius double precision,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    category character varying DEFAULT 'Dining,Shopping,Entertainment,Schools,Banks,Parks,Errands'::character varying,
    zoom integer,
    show_neighborhood boolean DEFAULT true,
    neighborhood_name character varying DEFAULT 'Neighborhood'::character varying,
    listing text,
    display_neighborhood_on_homepage boolean DEFAULT true
);


--
-- Name: neighborhoods_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.neighborhoods_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: neighborhoods_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.neighborhoods_id_seq OWNED BY public.neighborhoods.id;


--
-- Name: neighbour_units; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.neighbour_units (
    id integer NOT NULL,
    path_point_id integer,
    unit_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: neighbour_units_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.neighbour_units_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: neighbour_units_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.neighbour_units_id_seq OWNED BY public.neighbour_units.id;


--
-- Name: neighbourhood_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.neighbourhood_logs (
    id integer NOT NULL,
    from_ip character varying,
    cat character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: neighbourhood_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.neighbourhood_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: neighbourhood_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.neighbourhood_logs_id_seq OWNED BY public.neighbourhood_logs.id;


--
-- Name: oauth_access_grants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.oauth_access_grants (
    id integer NOT NULL,
    resource_owner_id integer NOT NULL,
    application_id integer,
    token character varying NOT NULL,
    expires_in integer NOT NULL,
    redirect_uri text NOT NULL,
    created_at timestamp without time zone NOT NULL,
    revoked_at timestamp without time zone,
    scopes character varying DEFAULT ''::character varying NOT NULL
);


--
-- Name: oauth_access_grants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.oauth_access_grants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: oauth_access_grants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.oauth_access_grants_id_seq OWNED BY public.oauth_access_grants.id;


--
-- Name: oauth_access_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.oauth_access_tokens (
    id integer NOT NULL,
    resource_owner_id integer,
    application_id integer,
    token character varying NOT NULL,
    refresh_token character varying,
    expires_in integer,
    revoked_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL,
    scopes character varying,
    previous_refresh_token character varying DEFAULT ''::character varying NOT NULL
);


--
-- Name: oauth_access_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.oauth_access_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: oauth_access_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.oauth_access_tokens_id_seq OWNED BY public.oauth_access_tokens.id;


--
-- Name: oauth_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.oauth_applications (
    id integer NOT NULL,
    name character varying NOT NULL,
    uid character varying NOT NULL,
    secret character varying NOT NULL,
    redirect_uri text NOT NULL,
    scopes character varying DEFAULT ''::character varying NOT NULL,
    confidential boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: oauth_applications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.oauth_applications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: oauth_applications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.oauth_applications_id_seq OWNED BY public.oauth_applications.id;


--
-- Name: opening_hours; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opening_hours (
    id integer NOT NULL,
    day character varying,
    opening_time character varying,
    closing_time character varying,
    community_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    sort integer
);


--
-- Name: opening_hours_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.opening_hours_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: opening_hours_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.opening_hours_id_seq OWNED BY public.opening_hours.id;


--
-- Name: other_locks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.other_locks (
    id integer NOT NULL,
    description character varying,
    community_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    area_type character varying
);


--
-- Name: other_locks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.other_locks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: other_locks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.other_locks_id_seq OWNED BY public.other_locks.id;


--
-- Name: partner_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_events (
    id bigint NOT NULL,
    partner_id bigint NOT NULL,
    user_id bigint,
    event character varying NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(6) without time zone NOT NULL
);


--
-- Name: partner_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.partner_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: partner_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.partner_events_id_seq OWNED BY public.partner_events.id;


--
-- Name: partners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partners (
    id bigint NOT NULL,
    key character varying NOT NULL,
    label character varying NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    api_key_digest character varying,
    api_key_prefix character varying,
    api_key_last4 character varying,
    env_var character varying,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    key_issued_at timestamp(6) without time zone,
    key_rotated_at timestamp(6) without time zone,
    key_revoked_at timestamp(6) without time zone,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: partners_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.partners_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: partners_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.partners_id_seq OWNED BY public.partners.id;


--
-- Name: path_points; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.path_points (
    id integer NOT NULL,
    x_plot integer,
    y_plot integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    path_id integer,
    "order" integer,
    reordered boolean DEFAULT false
);


--
-- Name: path_points_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.path_points_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: path_points_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.path_points_id_seq OWNED BY public.path_points.id;


--
-- Name: paths; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.paths (
    id integer NOT NULL,
    name character varying,
    map_path_id integer,
    map_path_type character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    map_path_to_type character varying,
    map_path_to_id integer,
    map_path_from_type character varying,
    map_path_from_id integer
);


--
-- Name: paths_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.paths_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: paths_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.paths_id_seq OWNED BY public.paths.id;


--
-- Name: portal_tour_stop_galleries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portal_tour_stop_galleries (
    id integer NOT NULL,
    portal_tour_stop_id integer,
    image character varying,
    description character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: portal_tour_stop_galleries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.portal_tour_stop_galleries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: portal_tour_stop_galleries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.portal_tour_stop_galleries_id_seq OWNED BY public.portal_tour_stop_galleries.id;


--
-- Name: portal_tour_stops; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portal_tour_stops (
    id integer NOT NULL,
    portal_tour_id integer,
    stop_type character varying,
    name character varying,
    starting_point character varying,
    description character varying,
    direction character varying,
    video_link character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    tour_stop_details character varying,
    amenity_type character varying
);


--
-- Name: portal_tour_stops_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.portal_tour_stops_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: portal_tour_stops_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.portal_tour_stops_id_seq OWNED BY public.portal_tour_stops.id;


--
-- Name: portal_tours; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portal_tours (
    id integer NOT NULL,
    community_id integer,
    start_tour character varying,
    max_tour integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    start_tour_point character varying
);


--
-- Name: portal_tours_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.portal_tours_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: portal_tours_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.portal_tours_id_seq OWNED BY public.portal_tours.id;


--
-- Name: portico_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portico_requests (
    id integer NOT NULL,
    app_name character varying,
    user_id integer,
    os_type character varying,
    app_version character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: portico_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.portico_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: portico_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.portico_requests_id_seq OWNED BY public.portico_requests.id;


--
-- Name: prospects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prospects (
    id integer NOT NULL,
    community_id integer,
    data_provider character varying,
    tour_user_id integer,
    data jsonb,
    activites jsonb,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    crm_provider character varying,
    tour_key character varying,
    sf_booking_id character varying,
    sf_booking_name character varying,
    sf_guest_id character varying,
    sf_status character varying DEFAULT ''::character varying
);


--
-- Name: prospects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.prospects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: prospects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.prospects_id_seq OWNED BY public.prospects.id;


--
-- Name: pynwheel_access_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pynwheel_access_users (
    id integer NOT NULL,
    community_id integer,
    user_type integer,
    name character varying,
    first_name character varying,
    last_name character varying,
    email character varying,
    phone_number character varying,
    move_in_date timestamp without time zone,
    move_out_date timestamp without time zone,
    lease_in_date timestamp without time zone,
    lease_out_date timestamp without time zone,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    is_verified boolean DEFAULT false,
    pin_code character varying,
    guest_id character varying,
    random_number integer,
    dwelo_status character varying,
    edge_state_status character varying,
    latch_status character varying,
    zerv_status character varying,
    igloohome_status character varying
);


--
-- Name: pynwheel_access_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pynwheel_access_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pynwheel_access_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pynwheel_access_users_id_seq OWNED BY public.pynwheel_access_users.id;


--
-- Name: read_marks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.read_marks (
    id integer NOT NULL,
    readable_type character varying,
    readable_id integer,
    reader_type character varying,
    reader_id integer,
    "timestamp" timestamp without time zone
);


--
-- Name: read_marks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.read_marks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: read_marks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.read_marks_id_seq OWNED BY public.read_marks.id;


--
-- Name: regions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.regions (
    id integer NOT NULL,
    name character varying,
    contact character varying,
    phone character varying,
    email character varying,
    creator_id integer,
    company_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: regions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.regions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: regions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.regions_id_seq OWNED BY public.regions.id;


--
-- Name: remote_locks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.remote_locks (
    id integer NOT NULL,
    remote_lock_type character varying,
    name character varying,
    edge_state_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    device_id character varying,
    stop_id integer,
    stop_type character varying,
    stop_name character varying,
    dwelo_id integer
);


--
-- Name: remote_locks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.remote_locks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: remote_locks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.remote_locks_id_seq OWNED BY public.remote_locks.id;


--
-- Name: resident_access_points; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resident_access_points (
    id integer NOT NULL,
    pynwheel_access_user_id integer,
    access_point_id integer,
    access_point_type character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    access_time timestamp without time zone,
    is_accessed boolean DEFAULT false
);


--
-- Name: resident_access_points_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.resident_access_points_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: resident_access_points_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.resident_access_points_id_seq OWNED BY public.resident_access_points.id;


--
-- Name: schedual_tours; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schedual_tours (
    id integer NOT NULL,
    tour_date date,
    tour_time time without time zone,
    tour_user_id integer,
    tour_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    community_id integer,
    hourly_email_sent boolean DEFAULT false,
    daily_email_sent boolean DEFAULT false,
    user_time_zone character varying,
    day_diff integer,
    charge_id character varying,
    pay_back_id character varying,
    end_time time without time zone,
    desired_bedroom integer,
    desired_move_in_date date,
    community_inform_email boolean DEFAULT false,
    tour_type character varying DEFAULT 'self_tour'::character varying,
    stops_list integer[] DEFAULT '{}'::integer[],
    is_tour_completed boolean DEFAULT false,
    missed_email_sent boolean DEFAULT false,
    created_by character varying DEFAULT 'Pynwheel'::character varying,
    yardirentcafe_prospect_id character varying,
    yardirentcafe_appointment_id character varying,
    yardirentcafe_leads_attribution character varying,
    confirmation_notification character varying,
    reschedule_notification character varying,
    property_tour_type character varying,
    tour_completed_at timestamp without time zone,
    country_code character varying,
    realpage_marketing_source character varying,
    salesforce_tour_booking_id character varying DEFAULT ''::character varying,
    salesforce_tour_booking_name character varying DEFAULT ''::character varying,
    knock_prospect_id character varying,
    knock_appointment_id character varying,
    knock_prospect_ip_address character varying,
    funnel_prospect_id character varying,
    funnel_appointment_id character varying,
    funnel_prospect_discover_source character varying DEFAULT ''::character varying,
    knock_prospect_discover_source character varying DEFAULT ''::character varying,
    rentcafe_discover_source character varying DEFAULT ''::character varying
);


--
-- Name: schedual_tours_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.schedual_tours_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: schedual_tours_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.schedual_tours_id_seq OWNED BY public.schedual_tours.id;


--
-- Name: scheduler_widget_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduler_widget_settings (
    id integer NOT NULL,
    btn_text character varying DEFAULT 'Schedule a Visit'::character varying,
    btn_color character varying DEFAULT '#20a345'::character varying,
    btn_width integer DEFAULT 130,
    btn_height integer DEFAULT 35,
    btn_font character varying DEFAULT 'Open Sans Regular'::character varying,
    btn_font_size character varying DEFAULT '14px'::character varying,
    tour_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: scheduler_widget_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.scheduler_widget_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: scheduler_widget_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.scheduler_widget_settings_id_seq OWNED BY public.scheduler_widget_settings.id;


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying NOT NULL
);


--
-- Name: schlages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schlages (
    id integer NOT NULL,
    email character varying,
    password character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    image character varying,
    community_id integer
);


--
-- Name: schlages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.schlages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: schlages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.schlages_id_seq OWNED BY public.schlages.id;


--
-- Name: sdk_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sdk_events (
    id bigint NOT NULL,
    sdk_session_id bigint,
    session_id character varying NOT NULL,
    parent_sdk_session_id character varying,
    community_id integer NOT NULL,
    company_id integer,
    client_type character varying NOT NULL,
    partner character varying,
    product character varying,
    sdk_version character varying,
    name character varying NOT NULL,
    action character varying,
    event_type character varying DEFAULT 'click'::character varying NOT NULL,
    occurred_at timestamp(6) without time zone NOT NULL,
    page_url text,
    unit_id integer,
    provider_unit_id character varying,
    unit_name character varying,
    building character varying,
    floor_level integer,
    floorplan_id integer,
    provider_floorplan_id character varying,
    floorplan_name character varying,
    bedrooms numeric(4,1),
    bathrooms numeric(4,1),
    square_footage integer,
    link_label character varying,
    link_url text,
    link_index integer,
    properties jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    amenity_id integer,
    amenity_name character varying
);


--
-- Name: sdk_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sdk_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sdk_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sdk_events_id_seq OWNED BY public.sdk_events.id;


--
-- Name: sdk_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sdk_sessions (
    id bigint NOT NULL,
    community_id integer NOT NULL,
    client_type character varying NOT NULL,
    session_id character varying NOT NULL,
    parent_sdk_session_id character varying,
    partner character varying,
    product character varying DEFAULT 'web'::character varying NOT NULL,
    sdk_version character varying DEFAULT 'v1'::character varying,
    community_time_zone character varying DEFAULT 'UTC'::character varying,
    start_datetime timestamp(6) without time zone,
    end_datetime timestamp(6) without time zone,
    map_interactions integer DEFAULT 0 NOT NULL,
    map_interactions_last_active timestamp(6) without time zone,
    visited_pages character varying[] DEFAULT '{}'::character varying[],
    events jsonb DEFAULT '{}'::jsonb NOT NULL,
    device_context jsonb DEFAULT '{}'::jsonb NOT NULL,
    full_event jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: sdk_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sdk_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sdk_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sdk_sessions_id_seq OWNED BY public.sdk_sessions.id;


--
-- Name: shared_tours; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shared_tours (
    id integer NOT NULL,
    name character varying,
    recipient_name character varying,
    phone character varying,
    email character varying,
    tour_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: shared_tours_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.shared_tours_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: shared_tours_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.shared_tours_id_seq OWNED BY public.shared_tours.id;


--
-- Name: sitemaps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sitemaps (
    id integer NOT NULL,
    image character varying,
    community_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    width integer DEFAULT 0,
    height integer DEFAULT 0,
    map_ocr_data jsonb,
    is_ocr_enabled boolean DEFAULT false,
    label_image character varying,
    file character varying,
    svg_image character varying,
    svg_metadata jsonb DEFAULT '{}'::jsonb,
    wayfinding_version integer DEFAULT 0 NOT NULL,
    svg_to_image_transform jsonb,
    scale_ft_per_px numeric(10,6)
);


--
-- Name: sitemaps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sitemaps_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sitemaps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sitemaps_id_seq OWNED BY public.sitemaps.id;


--
-- Name: statuses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.statuses (
    id integer NOT NULL,
    status integer,
    statusable_id bigint,
    statusable_type character varying,
    whodunnit integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    remarks text
);


--
-- Name: statuses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.statuses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: statuses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.statuses_id_seq OWNED BY public.statuses.id;


--
-- Name: stop_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stop_details (
    id integer NOT NULL,
    tour_stop_id integer,
    description character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: stop_details_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stop_details_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stop_details_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stop_details_id_seq OWNED BY public.stop_details.id;


--
-- Name: stop_galleries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stop_galleries (
    id integer NOT NULL,
    tour_stop_id integer,
    image character varying,
    name character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: stop_galleries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stop_galleries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stop_galleries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stop_galleries_id_seq OWNED BY public.stop_galleries.id;


--
-- Name: sub_communities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sub_communities (
    id bigint NOT NULL,
    name character varying,
    property_id character varying,
    community_id bigint NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    map_marker_color text DEFAULT '#d37474'::text
);


--
-- Name: sub_communities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sub_communities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sub_communities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sub_communities_id_seq OWNED BY public.sub_communities.id;


--
-- Name: svg_optimization_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.svg_optimization_runs (
    id bigint NOT NULL,
    community_id bigint NOT NULL,
    target_type character varying NOT NULL,
    target_id bigint NOT NULL,
    action character varying DEFAULT 'optimize'::character varying NOT NULL,
    reverts_run_id bigint,
    status character varying DEFAULT 'queued'::character varying NOT NULL,
    backup_url character varying,
    resulting_url character varying,
    original_bytes bigint,
    optimized_bytes bigint,
    reduction_pct numeric(5,1),
    error_message text,
    triggered_by_user_id bigint,
    started_at timestamp(6) without time zone,
    finished_at timestamp(6) without time zone,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: svg_optimization_runs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.svg_optimization_runs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: svg_optimization_runs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.svg_optimization_runs_id_seq OWNED BY public.svg_optimization_runs.id;


--
-- Name: temp_tables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.temp_tables (
    id integer NOT NULL,
    community_log character varying,
    community_log1 character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: temp_tables_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.temp_tables_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: temp_tables_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.temp_tables_id_seq OWNED BY public.temp_tables.id;


--
-- Name: temporary_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.temporary_images (
    id integer NOT NULL,
    image text,
    "position" integer,
    community_id integer,
    name character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: temporary_images_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.temporary_images_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: temporary_images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.temporary_images_id_seq OWNED BY public.temporary_images.id;


--
-- Name: three_d_maps_configurations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.three_d_maps_configurations (
    id integer NOT NULL,
    default_polygon_color character varying DEFAULT '#3ca832'::character varying,
    selected_polygon_color character varying DEFAULT '#5ca904'::character varying,
    default_polygon_opacity double precision DEFAULT 0.5,
    selected_polygon_opacity double precision DEFAULT 0.8,
    unit_color character varying DEFAULT '#202'::character varying,
    selected_unit_color character varying DEFAULT '#5ca904'::character varying,
    poi_color character varying DEFAULT '#008000'::character varying,
    community_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    faded_polygon_opacity double precision DEFAULT 0.3,
    show_unit_numbers boolean DEFAULT true,
    hide_floors boolean DEFAULT true
);


--
-- Name: three_d_maps_configurations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.three_d_maps_configurations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: three_d_maps_configurations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.three_d_maps_configurations_id_seq OWNED BY public.three_d_maps_configurations.id;


--
-- Name: tour_histories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tour_histories (
    id integer NOT NULL,
    arrived timestamp without time zone,
    "left" timestamp without time zone,
    id_mismatch boolean,
    abandoned_tour_at_stop integer,
    tour_user_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    lengthy_stay timestamp without time zone,
    lengthy_stay_email_sent boolean DEFAULT false,
    tour_id integer,
    end_tour_email_sent boolean DEFAULT false,
    abandoned_tour_email_sent boolean DEFAULT false,
    my_time_zone character varying,
    desired_bedroom integer,
    is_left boolean DEFAULT false,
    tour_status character varying,
    active_app boolean DEFAULT true,
    history boolean DEFAULT false,
    tour_key character varying,
    latitude numeric,
    longitude numeric,
    is_virtual_tour boolean DEFAULT false,
    verified_by character varying,
    lock_access_time time without time zone,
    see_availability_counter integer DEFAULT 0,
    apply_click_counter integer DEFAULT 0,
    price_opened_counter integer DEFAULT 0,
    notes_opened_counter integer DEFAULT 0,
    camera_opened_counter integer DEFAULT 0,
    visited_pages_counter integer DEFAULT 0,
    tour_type character varying DEFAULT ''::character varying,
    tour_state character varying DEFAULT 'abandoned'::character varying,
    tour_site character varying DEFAULT ''::character varying,
    community_id integer,
    community_time_zone character varying DEFAULT 'UTC'::character varying
);


--
-- Name: tour_histories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tour_histories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tour_histories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tour_histories_id_seq OWNED BY public.tour_histories.id;


--
-- Name: tour_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tour_settings (
    id integer NOT NULL,
    show_checklist boolean,
    show_first_name boolean,
    show_last_name boolean,
    show_phone boolean,
    show_email boolean,
    show_desired_bedroom boolean,
    show_desired_move_in_date boolean,
    desired_bedroom integer,
    desired_move_in_date date,
    tour_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    time_intervel character varying DEFAULT '15 min'::character varying,
    do_limit_max_tour boolean DEFAULT false,
    limit_max_tour_type character varying DEFAULT 'scheduling'::character varying,
    limit_max_tour integer DEFAULT 5,
    allow_virtual_tour boolean DEFAULT false,
    allow_self_tour boolean DEFAULT true,
    allow_guided_tour boolean DEFAULT true,
    length_stay_limit integer DEFAULT 45,
    charge_user_for_id_verfication boolean DEFAULT false,
    email_header_color character varying DEFAULT '#808080'::character varying,
    email_footer_color character varying DEFAULT '#808080'::character varying,
    enable_header_footer boolean DEFAULT true,
    enable_restricted_property_access boolean DEFAULT false,
    enable_tour_customization boolean DEFAULT false,
    bypass_stop_lock_access boolean DEFAULT true
);


--
-- Name: tour_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tour_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tour_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tour_settings_id_seq OWNED BY public.tour_settings.id;


--
-- Name: tour_stops; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tour_stops (
    id integer NOT NULL,
    tour_id integer,
    latitude numeric,
    longitude numeric,
    stop_id integer,
    stop_type character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    name character varying,
    sort integer,
    display_stop boolean DEFAULT true,
    duration_minutes integer
);


--
-- Name: tour_stops_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tour_stops_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tour_stops_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tour_stops_id_seq OWNED BY public.tour_stops.id;


--
-- Name: tour_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tour_users (
    id integer NOT NULL,
    name character varying,
    email character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    card_expiry character varying,
    phone_number character varying,
    image character varying,
    id_card character varying,
    id_selfie_mismatch boolean DEFAULT false NOT NULL,
    first_name character varying,
    last_name character varying,
    image_bit boolean DEFAULT false,
    croped boolean DEFAULT false,
    secure_random character varying,
    desired_bedroom integer,
    random_number integer,
    tour_type character varying DEFAULT 'self_tour'::character varying,
    tour_key character varying,
    latitude numeric,
    longitude numeric,
    is_virtual_tour boolean DEFAULT false,
    verified_by character varying,
    authentication_request_id character varying,
    authenteq_response character varying,
    strip_customer_id character varying,
    card_last_digits character varying,
    arrival_email_sent boolean DEFAULT false,
    lock_access_time time without time zone,
    dwelo_status character varying,
    edge_state_status character varying,
    latch_status character varying,
    zerv_status character varying,
    is_sms_enabled boolean DEFAULT true,
    is_authentiq_verified boolean DEFAULT false,
    is_checkpoint_verified boolean DEFAULT false,
    authentiq_verified_at timestamp without time zone,
    checkpoint_verified_at timestamp without time zone,
    igloohome_status character varying,
    property_access_code integer,
    property_access_code_generated_at timestamp without time zone,
    restricted_property_access boolean DEFAULT false,
    pin_code character varying
);


--
-- Name: tour_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tour_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tour_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tour_users_id_seq OWNED BY public.tour_users.id;


--
-- Name: tours; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tours (
    id integer NOT NULL,
    community_id integer,
    name character varying,
    latitude numeric,
    longitude numeric,
    image character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    x_plot integer DEFAULT 0,
    y_plot integer DEFAULT 0,
    sort_hash json DEFAULT '"{}"'::json NOT NULL,
    visual_id_verification boolean DEFAULT true,
    marker_icon_size character varying,
    dotted_line_color character varying DEFAULT '#008FD5'::character varying,
    max_tour_users character varying,
    credit_card_required boolean DEFAULT true,
    starting_floor integer,
    floor_elevator json DEFAULT '"{}"'::json NOT NULL,
    building character varying,
    marketing_source_required boolean DEFAULT false,
    only_scheduled_tour boolean DEFAULT false,
    grace_period integer DEFAULT 10,
    verification_type character varying DEFAULT 'check_point_id'::character varying,
    building_order text[] DEFAULT '{}'::text[],
    max_virtual_tour_users integer,
    max_self_tour_users integer,
    max_guided_tour_users integer,
    enable_auto_zoom boolean DEFAULT true,
    lock_provider character varying DEFAULT ''::character varying,
    access_code character varying,
    tour_user_id integer,
    skip_tour_editing boolean DEFAULT false,
    copy_sort_hash json DEFAULT '"{}"'::json NOT NULL,
    tour_setup_version integer DEFAULT 0 NOT NULL
);


--
-- Name: tours_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tours_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tours_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tours_id_seq OWNED BY public.tours.id;


--
-- Name: track_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.track_sessions (
    id integer NOT NULL,
    start_datetime timestamp without time zone,
    end_datetime timestamp without time zone,
    track_session_type character varying DEFAULT ''::character varying,
    community_id integer,
    session_id character varying DEFAULT ''::character varying,
    visited_pages character varying[] DEFAULT '{}'::character varying[],
    apply_click_counter integer DEFAULT 0,
    favorite_saved_counter integer DEFAULT 0,
    favorite_sent_counter integer DEFAULT 0,
    price_opened_counter integer DEFAULT 0,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    community_time_zone character varying DEFAULT 'UTC'::character varying,
    partner character varying,
    amenity_marker_hovers integer DEFAULT 0,
    unit_marker_hovers integer DEFAULT 0,
    unit_marker_clicks integer DEFAULT 0,
    amenity_marker_clicks integer DEFAULT 0,
    sorting_filter_clicks integer DEFAULT 0,
    bedroom_filter_clicks integer DEFAULT 0,
    pricing_filter_clicks integer DEFAULT 0,
    square_feet_filter_clicks integer DEFAULT 0,
    availability_filter_clicks integer DEFAULT 0,
    reset_filter_clicks integer DEFAULT 0,
    view_saved_clicks integer DEFAULT 0,
    schedule_tour_clicks integer DEFAULT 0,
    logo_clicks integer DEFAULT 0,
    floor_number_clicks integer DEFAULT 0,
    zoom_in_clicks integer DEFAULT 0,
    zoom_out_clicks integer DEFAULT 0,
    zoom_refresh_clicks integer DEFAULT 0,
    clear_favorites_clicks integer DEFAULT 0,
    other_hovers integer DEFAULT 0,
    other_clicks integer DEFAULT 0,
    map_interactions integer DEFAULT 1,
    map_interactions_last_active timestamp without time zone,
    virtual_tour_clicks integer DEFAULT 0,
    unit_modal_buttons_clicks integer DEFAULT 0,
    open_pricing_matrix_clicks integer DEFAULT 0,
    hide_pricing_matrix_clicks integer DEFAULT 0
);


--
-- Name: track_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.track_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: track_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.track_sessions_id_seq OWNED BY public.track_sessions.id;


--
-- Name: tutorials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tutorials (
    id integer NOT NULL,
    community_id integer,
    name character varying,
    description character varying,
    video_type character varying,
    video character varying,
    filename character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    pynwheel_touch boolean DEFAULT true,
    pynwheel_maps boolean DEFAULT true,
    self_tour boolean DEFAULT true
);


--
-- Name: tutorials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tutorials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tutorials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tutorials_id_seq OWNED BY public.tutorials.id;


--
-- Name: unit_elevators; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unit_elevators (
    id integer NOT NULL,
    unit_id integer NOT NULL,
    elevator_id integer NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: unit_elevators_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.unit_elevators_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: unit_elevators_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.unit_elevators_id_seq OWNED BY public.unit_elevators.id;


--
-- Name: unit_space_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unit_space_details (
    id bigint NOT NULL,
    unit_id bigint NOT NULL,
    community_id integer NOT NULL,
    provider character varying NOT NULL,
    provider_space_id character varying,
    space_letter character varying,
    space_option character varying,
    amenities jsonb DEFAULT '[]'::jsonb NOT NULL,
    premium_amenities jsonb DEFAULT '[]'::jsonb NOT NULL,
    lease_terms jsonb DEFAULT '[]'::jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    lease_start_date date,
    lease_end_date date,
    space_rent numeric(10,2),
    synced_at timestamp(6) without time zone,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: unit_space_details_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.unit_space_details_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: unit_space_details_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.unit_space_details_id_seq OWNED BY public.unit_space_details.id;


--
-- Name: units; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.units (
    id integer NOT NULL,
    community_id integer,
    provider character varying,
    property_id character varying,
    provider_unit_id character varying,
    unit_type character varying,
    marketing_name character varying,
    floorplan_id character varying,
    market_rent double precision,
    effective_rent double precision,
    availability character varying,
    available_date date,
    building character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    x_plot integer DEFAULT 0,
    y_plot integer DEFAULT 0,
    floorplate_id integer,
    lease_term integer DEFAULT 12,
    image character varying,
    floor integer,
    standard_image_url character varying,
    updated_by_admin boolean DEFAULT false,
    available boolean,
    sold boolean DEFAULT false,
    manually_updated boolean DEFAULT false,
    manual_override boolean DEFAULT false,
    square_feet double precision,
    description text,
    secondary_image character varying,
    availability_url character varying,
    lease_pricing character varying,
    name_is_updated boolean,
    floorplan_id_is_updated boolean,
    effective_rent_is_updated boolean,
    available_date_is_updated boolean,
    available_is_updated boolean,
    sold_is_updated boolean,
    floor_is_updated boolean,
    building_is_updated boolean,
    availability_is_updated boolean,
    stop_description character varying,
    display_virtual_tour_button_label boolean DEFAULT false,
    virtual_tour_button_label character varying DEFAULT '3D Tour'::character varying,
    virtual_tour_url character varying,
    max_effective_rent double precision,
    min_effective_rent double precision,
    avg_effective_rent double precision,
    sitemap_image_url character varying,
    "iframe_enable_for_3Dtour" boolean DEFAULT true,
    modal_unit boolean DEFAULT false,
    availability_url_deep_linking character varying,
    access_code character varying,
    crop_x double precision,
    crop_y double precision,
    crop_w double precision,
    crop_h double precision,
    crop_x_secondary double precision,
    crop_y_secondary double precision,
    crop_w_secondary double precision,
    crop_h_secondary double precision,
    image_bit boolean,
    do_crop boolean DEFAULT false,
    do_crop_secpndary boolean DEFAULT false,
    lock_provider character varying DEFAULT ''::character varying,
    unit_status character varying DEFAULT ''::character varying,
    visible boolean DEFAULT true,
    tour_visiting_order_number integer,
    additional_fee character varying DEFAULT ''::character varying,
    pointer_data jsonb DEFAULT '{}'::jsonb,
    voyager_property_code character varying,
    additional_button character varying,
    additional_url character varying,
    scheduler_label character varying,
    scheduler_url character varying,
    show_on_map boolean DEFAULT false,
    link1_open_new_tab boolean DEFAULT false,
    link2_open_new_tab boolean DEFAULT false,
    link3_open_new_tab boolean DEFAULT false,
    description_title character varying DEFAULT 'More Details'::character varying,
    expand_description_in_popup boolean DEFAULT false
);


--
-- Name: units_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.units_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: units_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.units_id_seq OWNED BY public.units.id;


--
-- Name: user_stripes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_stripes (
    id integer NOT NULL,
    tour_user_id integer,
    charge_amount_in_cent integer,
    charge_id character varying,
    refund_id character varying,
    refund_amount_in_cent integer,
    last_digits character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: user_stripes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_stripes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_stripes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_stripes_id_seq OWNED BY public.user_stripes.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying DEFAULT ''::character varying NOT NULL,
    encrypted_password character varying DEFAULT ''::character varying NOT NULL,
    reset_password_token character varying,
    reset_password_sent_at timestamp without time zone,
    remember_created_at timestamp without time zone,
    sign_in_count integer DEFAULT 0 NOT NULL,
    current_sign_in_at timestamp without time zone,
    last_sign_in_at timestamp without time zone,
    current_sign_in_ip inet,
    last_sign_in_ip inet,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    first_name character varying,
    last_name character varying,
    role character varying,
    avatar character varying,
    invitation_token character varying,
    invitation_created_at timestamp without time zone,
    invitation_sent_at timestamp without time zone,
    invitation_accepted_at timestamp without time zone,
    invitation_limit integer,
    invited_by_type character varying,
    invited_by_id integer,
    invitations_count integer DEFAULT 0,
    company_id integer,
    company_name character varying,
    community_logs character varying,
    entrata_list_logs character varying,
    entrata_function_logs character varying,
    welcome_prompt boolean DEFAULT false,
    welcome_property_details_page boolean DEFAULT false,
    welcome_logo_page boolean DEFAULT false,
    welcome_homepage_page boolean DEFAULT false,
    welcome_floorplate_page boolean DEFAULT false,
    welcome_amenity_page boolean DEFAULT false,
    welcome_floorplan_page boolean DEFAULT false,
    welcome_sitemap_page boolean DEFAULT false,
    welcome_edit_floorplan_page boolean DEFAULT false,
    welcome_unit_page boolean DEFAULT false,
    welcome_neighbourhood_page boolean DEFAULT false,
    welcome_favorite_page boolean DEFAULT false,
    welcome_additional_page boolean DEFAULT false,
    welcome_gallery_page boolean DEFAULT false,
    welcome_floorplate_plot_page boolean DEFAULT true,
    welcome_tour_setup boolean DEFAULT false,
    welcome_tour_setting boolean DEFAULT false,
    enable_community_id integer,
    last_seen timestamp without time zone,
    region_id integer,
    product_options jsonb,
    pynwheel_launch_access boolean DEFAULT false,
    pynwheel_connect_access boolean DEFAULT true
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.versions (
    id integer NOT NULL,
    item_type character varying NOT NULL,
    item_id bigint NOT NULL,
    event character varying NOT NULL,
    whodunnit character varying,
    community_id integer,
    company_id integer,
    object text,
    created_at timestamp without time zone
);


--
-- Name: versions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.versions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: versions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.versions_id_seq OWNED BY public.versions.id;


--
-- Name: visited_stops; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visited_stops (
    id integer NOT NULL,
    tour_user_id integer,
    image character varying,
    tour_stop_id integer,
    description character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    tour_id integer,
    device_id character varying,
    tour_key character varying,
    is_rotated boolean DEFAULT true,
    event_time time without time zone,
    event_date date,
    is_tracked boolean DEFAULT false,
    lat_lang jsonb DEFAULT '[]'::jsonb,
    stop_type character varying,
    stop_pin character varying
);


--
-- Name: visited_stops_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.visited_stops_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: visited_stops_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.visited_stops_id_seq OWNED BY public.visited_stops.id;


--
-- Name: wayfinding_stops; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wayfinding_stops (
    id bigint NOT NULL,
    community_id integer NOT NULL,
    map_type character varying NOT NULL,
    map_id integer NOT NULL,
    kind character varying NOT NULL,
    name character varying NOT NULL,
    building character varying,
    floor integer,
    x_plot double precision,
    y_plot double precision,
    space character varying DEFAULT 'raster'::character varying NOT NULL,
    accessible boolean DEFAULT true NOT NULL,
    lock_provider character varying DEFAULT ''::character varying NOT NULL,
    access_code character varying,
    note text,
    radius_px double precision,
    hallway_id integer,
    status character varying DEFAULT 'active'::character varying NOT NULL,
    source character varying DEFAULT 'manual'::character varying NOT NULL,
    created_by_user_id integer,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: wayfinding_stops_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.wayfinding_stops_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: wayfinding_stops_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.wayfinding_stops_id_seq OWNED BY public.wayfinding_stops.id;


--
-- Name: web_hook_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.web_hook_logs (
    id integer NOT NULL,
    webhook_type character varying,
    community_name character varying,
    community_id character varying,
    params jsonb,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: web_hook_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.web_hook_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: web_hook_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.web_hook_logs_id_seq OWNED BY public.web_hook_logs.id;


--
-- Name: webpages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webpages (
    id integer NOT NULL,
    name character varying,
    url character varying,
    community_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    hide_page boolean DEFAULT false,
    display_on_homepage boolean,
    "position" integer,
    "iframe_enable_for_3Dtour" boolean DEFAULT false
);


--
-- Name: webpages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.webpages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: webpages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.webpages_id_seq OWNED BY public.webpages.id;


--
-- Name: yales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.yales (
    id integer NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    community_id integer
);


--
-- Name: yales_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.yales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: yales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.yales_id_seq OWNED BY public.yales.id;


--
-- Name: zerv_guests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zerv_guests (
    id integer NOT NULL,
    status character varying,
    res_errors jsonb,
    tour_user_id integer,
    community_id integer,
    guest_of_stop_type character varying,
    guest_of_stop_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    pynwheel_access_user_id integer
);


--
-- Name: zerv_guests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.zerv_guests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: zerv_guests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.zerv_guests_id_seq OWNED BY public.zerv_guests.id;


--
-- Name: zerv_locks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zerv_locks (
    id integer NOT NULL,
    mac_id character varying,
    is_device_active boolean,
    location_name character varying,
    location_friendly_name character varying,
    sub_location_name character varying,
    sub_location_friendly_name character varying,
    universal_access_code character varying,
    zerv_id integer,
    stop_type character varying,
    stop_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: zerv_locks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.zerv_locks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: zerv_locks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.zerv_locks_id_seq OWNED BY public.zerv_locks.id;


--
-- Name: zervs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zervs (
    id integer NOT NULL,
    username character varying,
    password character varying,
    community_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    facility_id character varying,
    badge_id character varying,
    card_format character varying,
    lock_instruction_text character varying DEFAULT ''::character varying,
    lock_image character varying DEFAULT ''::character varying,
    amenity_lock_instruction_text character varying DEFAULT ''::character varying,
    amenity_lock_image character varying DEFAULT ''::character varying
);


--
-- Name: zervs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.zervs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: zervs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.zervs_id_seq OWNED BY public.zervs.id;


--
-- Name: access_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_logs ALTER COLUMN id SET DEFAULT nextval('public.access_logs_id_seq'::regclass);


--
-- Name: additional_files id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.additional_files ALTER COLUMN id SET DEFAULT nextval('public.additional_files_id_seq'::regclass);


--
-- Name: additional_images id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.additional_images ALTER COLUMN id SET DEFAULT nextval('public.additional_images_id_seq'::regclass);


--
-- Name: alert_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_messages ALTER COLUMN id SET DEFAULT nextval('public.alert_messages_id_seq'::regclass);


--
-- Name: allowed_emails id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allowed_emails ALTER COLUMN id SET DEFAULT nextval('public.allowed_emails_id_seq'::regclass);


--
-- Name: amenities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amenities ALTER COLUMN id SET DEFAULT nextval('public.amenities_id_seq'::regclass);


--
-- Name: amenity_galleries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amenity_galleries ALTER COLUMN id SET DEFAULT nextval('public.amenity_galleries_id_seq'::regclass);


--
-- Name: app_versions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_versions ALTER COLUMN id SET DEFAULT nextval('public.app_versions_id_seq'::regclass);


--
-- Name: as_guests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.as_guests ALTER COLUMN id SET DEFAULT nextval('public.as_guests_id_seq'::regclass);


--
-- Name: bedroom_marker_colors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bedroom_marker_colors ALTER COLUMN id SET DEFAULT nextval('public.bedroom_marker_colors_id_seq'::regclass);


--
-- Name: building_starting_points id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.building_starting_points ALTER COLUMN id SET DEFAULT nextval('public.building_starting_points_id_seq'::regclass);


--
-- Name: calculator_configs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calculator_configs ALTER COLUMN id SET DEFAULT nextval('public.calculator_configs_id_seq'::regclass);


--
-- Name: chatrooms id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chatrooms ALTER COLUMN id SET DEFAULT nextval('public.chatrooms_id_seq'::regclass);


--
-- Name: chats id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chats ALTER COLUMN id SET DEFAULT nextval('public.chats_id_seq'::regclass);


--
-- Name: comments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments ALTER COLUMN id SET DEFAULT nextval('public.comments_id_seq'::regclass);


--
-- Name: communities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communities ALTER COLUMN id SET DEFAULT nextval('public.communities_id_seq'::regclass);


--
-- Name: community_groups id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_groups ALTER COLUMN id SET DEFAULT nextval('public.community_groups_id_seq'::regclass);


--
-- Name: community_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_users ALTER COLUMN id SET DEFAULT nextval('public.community_users_id_seq'::regclass);


--
-- Name: companies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies ALTER COLUMN id SET DEFAULT nextval('public.companies_id_seq'::regclass);


--
-- Name: company_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_settings ALTER COLUMN id SET DEFAULT nextval('public.company_settings_id_seq'::regclass);


--
-- Name: credentials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credentials ALTER COLUMN id SET DEFAULT nextval('public.credentials_id_seq'::regclass);


--
-- Name: crm_credentials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_credentials ALTER COLUMN id SET DEFAULT nextval('public.crm_credentials_id_seq'::regclass);


--
-- Name: crm_discovery_sources id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_discovery_sources ALTER COLUMN id SET DEFAULT nextval('public.crm_discovery_sources_id_seq'::regclass);


--
-- Name: crm_time_slots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_time_slots ALTER COLUMN id SET DEFAULT nextval('public.crm_time_slots_id_seq'::regclass);


--
-- Name: default_images id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.default_images ALTER COLUMN id SET DEFAULT nextval('public.default_images_id_seq'::regclass);


--
-- Name: delayed_jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delayed_jobs ALTER COLUMN id SET DEFAULT nextval('public.delayed_jobs_id_seq'::regclass);


--
-- Name: design_directions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.design_directions ALTER COLUMN id SET DEFAULT nextval('public.design_directions_id_seq'::regclass);


--
-- Name: design_system_configs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.design_system_configs ALTER COLUMN id SET DEFAULT nextval('public.design_system_configs_id_seq'::regclass);


--
-- Name: designs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.designs ALTER COLUMN id SET DEFAULT nextval('public.designs_id_seq'::regclass);


--
-- Name: doors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doors ALTER COLUMN id SET DEFAULT nextval('public.doors_id_seq'::regclass);


--
-- Name: dwelos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dwelos ALTER COLUMN id SET DEFAULT nextval('public.dwelos_id_seq'::regclass);


--
-- Name: ebrochure_menu_buttons id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ebrochure_menu_buttons ALTER COLUMN id SET DEFAULT nextval('public.ebrochure_menu_buttons_id_seq'::regclass);


--
-- Name: edge_states id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edge_states ALTER COLUMN id SET DEFAULT nextval('public.edge_states_id_seq'::regclass);


--
-- Name: elevator_banks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elevator_banks ALTER COLUMN id SET DEFAULT nextval('public.elevator_banks_id_seq'::regclass);


--
-- Name: elevator_galleries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elevator_galleries ALTER COLUMN id SET DEFAULT nextval('public.elevator_galleries_id_seq'::regclass);


--
-- Name: elevators id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elevators ALTER COLUMN id SET DEFAULT nextval('public.elevators_id_seq'::regclass);


--
-- Name: expressionists id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expressionists ALTER COLUMN id SET DEFAULT nextval('public.expressionists_id_seq'::regclass);


--
-- Name: favorite_images id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_images ALTER COLUMN id SET DEFAULT nextval('public.favorite_images_id_seq'::regclass);


--
-- Name: favorite_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_settings ALTER COLUMN id SET DEFAULT nextval('public.favorite_settings_id_seq'::regclass);


--
-- Name: favorite_stops id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_stops ALTER COLUMN id SET DEFAULT nextval('public.favorite_stops_id_seq'::regclass);


--
-- Name: favorites id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites ALTER COLUMN id SET DEFAULT nextval('public.favorites_id_seq'::regclass);


--
-- Name: feedbacks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedbacks ALTER COLUMN id SET DEFAULT nextval('public.feedbacks_id_seq'::regclass);


--
-- Name: filter_panels id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.filter_panels ALTER COLUMN id SET DEFAULT nextval('public.filter_panels_id_seq'::regclass);


--
-- Name: floorplans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.floorplans ALTER COLUMN id SET DEFAULT nextval('public.floorplans_id_seq'::regclass);


--
-- Name: floorplates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.floorplates ALTER COLUMN id SET DEFAULT nextval('public.floorplates_id_seq'::regclass);


--
-- Name: font_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.font_settings ALTER COLUMN id SET DEFAULT nextval('public.font_settings_id_seq'::regclass);


--
-- Name: gables id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gables ALTER COLUMN id SET DEFAULT nextval('public.gables_id_seq'::regclass);


--
-- Name: galleries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.galleries ALTER COLUMN id SET DEFAULT nextval('public.galleries_id_seq'::regclass);


--
-- Name: gallery_images id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gallery_images ALTER COLUMN id SET DEFAULT nextval('public.gallery_images_id_seq'::regclass);


--
-- Name: group_designs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_designs ALTER COLUMN id SET DEFAULT nextval('public.group_designs_id_seq'::regclass);


--
-- Name: group_homepage_images id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_homepage_images ALTER COLUMN id SET DEFAULT nextval('public.group_homepage_images_id_seq'::regclass);


--
-- Name: group_homepage_videos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_homepage_videos ALTER COLUMN id SET DEFAULT nextval('public.group_homepage_videos_id_seq'::regclass);


--
-- Name: guided_opening_hours id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guided_opening_hours ALTER COLUMN id SET DEFAULT nextval('public.guided_opening_hours_id_seq'::regclass);


--
-- Name: hallway_attachments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hallway_attachments ALTER COLUMN id SET DEFAULT nextval('public.hallway_attachments_id_seq'::regclass);


--
-- Name: hallway_detection_runs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hallway_detection_runs ALTER COLUMN id SET DEFAULT nextval('public.hallway_detection_runs_id_seq'::regclass);


--
-- Name: hallway_edges id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hallway_edges ALTER COLUMN id SET DEFAULT nextval('public.hallway_edges_id_seq'::regclass);


--
-- Name: hallway_suppressions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hallway_suppressions ALTER COLUMN id SET DEFAULT nextval('public.hallway_suppressions_id_seq'::regclass);


--
-- Name: hallways id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hallways ALTER COLUMN id SET DEFAULT nextval('public.hallways_id_seq'::regclass);


--
-- Name: hardware_specs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hardware_specs ALTER COLUMN id SET DEFAULT nextval('public.hardware_specs_id_seq'::regclass);


--
-- Name: home_page_images id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.home_page_images ALTER COLUMN id SET DEFAULT nextval('public.home_page_images_id_seq'::regclass);


--
-- Name: home_page_videos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.home_page_videos ALTER COLUMN id SET DEFAULT nextval('public.home_page_videos_id_seq'::regclass);


--
-- Name: home_screens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.home_screens ALTER COLUMN id SET DEFAULT nextval('public.home_screens_id_seq'::regclass);


--
-- Name: homepage_icons id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homepage_icons ALTER COLUMN id SET DEFAULT nextval('public.homepage_icons_id_seq'::regclass);


--
-- Name: igloo_guests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.igloo_guests ALTER COLUMN id SET DEFAULT nextval('public.igloo_guests_id_seq'::regclass);


--
-- Name: igloohome_guests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.igloohome_guests ALTER COLUMN id SET DEFAULT nextval('public.igloohome_guests_id_seq'::regclass);


--
-- Name: igloohome_locks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.igloohome_locks ALTER COLUMN id SET DEFAULT nextval('public.igloohome_locks_id_seq'::regclass);


--
-- Name: igloohomes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.igloohomes ALTER COLUMN id SET DEFAULT nextval('public.igloohomes_id_seq'::regclass);


--
-- Name: imagepages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imagepages ALTER COLUMN id SET DEFAULT nextval('public.imagepages_id_seq'::regclass);


--
-- Name: impressions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impressions ALTER COLUMN id SET DEFAULT nextval('public.impressions_id_seq'::regclass);


--
-- Name: latch_allowed_accesses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.latch_allowed_accesses ALTER COLUMN id SET DEFAULT nextval('public.latch_allowed_accesses_id_seq'::regclass);


--
-- Name: latch_auth_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.latch_auth_tokens ALTER COLUMN id SET DEFAULT nextval('public.latch_auth_tokens_id_seq'::regclass);


--
-- Name: latch_guests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.latch_guests ALTER COLUMN id SET DEFAULT nextval('public.latch_guests_id_seq'::regclass);


--
-- Name: latch_locks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.latch_locks ALTER COLUMN id SET DEFAULT nextval('public.latch_locks_id_seq'::regclass);


--
-- Name: latches id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.latches ALTER COLUMN id SET DEFAULT nextval('public.latches_id_seq'::regclass);


--
-- Name: launch_remotes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.launch_remotes ALTER COLUMN id SET DEFAULT nextval('public.launch_remotes_id_seq'::regclass);


--
-- Name: locations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations ALTER COLUMN id SET DEFAULT nextval('public.locations_id_seq'::regclass);


--
-- Name: lock_histories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lock_histories ALTER COLUMN id SET DEFAULT nextval('public.lock_histories_id_seq'::regclass);


--
-- Name: main_screens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.main_screens ALTER COLUMN id SET DEFAULT nextval('public.main_screens_id_seq'::regclass);


--
-- Name: map_filters id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.map_filters ALTER COLUMN id SET DEFAULT nextval('public.map_filters_id_seq'::regclass);


--
-- Name: map_partners id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.map_partners ALTER COLUMN id SET DEFAULT nextval('public.map_partners_id_seq'::regclass);


--
-- Name: maps_positions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maps_positions ALTER COLUMN id SET DEFAULT nextval('public.maps_positions_id_seq'::regclass);


--
-- Name: menus id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menus ALTER COLUMN id SET DEFAULT nextval('public.menus_id_seq'::regclass);


--
-- Name: neighborhoods id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.neighborhoods ALTER COLUMN id SET DEFAULT nextval('public.neighborhoods_id_seq'::regclass);


--
-- Name: neighbour_units id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.neighbour_units ALTER COLUMN id SET DEFAULT nextval('public.neighbour_units_id_seq'::regclass);


--
-- Name: neighbourhood_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.neighbourhood_logs ALTER COLUMN id SET DEFAULT nextval('public.neighbourhood_logs_id_seq'::regclass);


--
-- Name: oauth_access_grants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_access_grants ALTER COLUMN id SET DEFAULT nextval('public.oauth_access_grants_id_seq'::regclass);


--
-- Name: oauth_access_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_access_tokens ALTER COLUMN id SET DEFAULT nextval('public.oauth_access_tokens_id_seq'::regclass);


--
-- Name: oauth_applications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_applications ALTER COLUMN id SET DEFAULT nextval('public.oauth_applications_id_seq'::regclass);


--
-- Name: opening_hours id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opening_hours ALTER COLUMN id SET DEFAULT nextval('public.opening_hours_id_seq'::regclass);


--
-- Name: other_locks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.other_locks ALTER COLUMN id SET DEFAULT nextval('public.other_locks_id_seq'::regclass);


--
-- Name: partner_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_events ALTER COLUMN id SET DEFAULT nextval('public.partner_events_id_seq'::regclass);


--
-- Name: partners id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partners ALTER COLUMN id SET DEFAULT nextval('public.partners_id_seq'::regclass);


--
-- Name: path_points id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.path_points ALTER COLUMN id SET DEFAULT nextval('public.path_points_id_seq'::regclass);


--
-- Name: paths id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paths ALTER COLUMN id SET DEFAULT nextval('public.paths_id_seq'::regclass);


--
-- Name: portal_tour_stop_galleries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_tour_stop_galleries ALTER COLUMN id SET DEFAULT nextval('public.portal_tour_stop_galleries_id_seq'::regclass);


--
-- Name: portal_tour_stops id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_tour_stops ALTER COLUMN id SET DEFAULT nextval('public.portal_tour_stops_id_seq'::regclass);


--
-- Name: portal_tours id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_tours ALTER COLUMN id SET DEFAULT nextval('public.portal_tours_id_seq'::regclass);


--
-- Name: portico_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portico_requests ALTER COLUMN id SET DEFAULT nextval('public.portico_requests_id_seq'::regclass);


--
-- Name: prospects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prospects ALTER COLUMN id SET DEFAULT nextval('public.prospects_id_seq'::regclass);


--
-- Name: pynwheel_access_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pynwheel_access_users ALTER COLUMN id SET DEFAULT nextval('public.pynwheel_access_users_id_seq'::regclass);


--
-- Name: read_marks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.read_marks ALTER COLUMN id SET DEFAULT nextval('public.read_marks_id_seq'::regclass);


--
-- Name: regions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regions ALTER COLUMN id SET DEFAULT nextval('public.regions_id_seq'::regclass);


--
-- Name: remote_locks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.remote_locks ALTER COLUMN id SET DEFAULT nextval('public.remote_locks_id_seq'::regclass);


--
-- Name: resident_access_points id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resident_access_points ALTER COLUMN id SET DEFAULT nextval('public.resident_access_points_id_seq'::regclass);


--
-- Name: schedual_tours id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedual_tours ALTER COLUMN id SET DEFAULT nextval('public.schedual_tours_id_seq'::regclass);


--
-- Name: scheduler_widget_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduler_widget_settings ALTER COLUMN id SET DEFAULT nextval('public.scheduler_widget_settings_id_seq'::regclass);


--
-- Name: schlages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schlages ALTER COLUMN id SET DEFAULT nextval('public.schlages_id_seq'::regclass);


--
-- Name: sdk_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sdk_events ALTER COLUMN id SET DEFAULT nextval('public.sdk_events_id_seq'::regclass);


--
-- Name: sdk_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sdk_sessions ALTER COLUMN id SET DEFAULT nextval('public.sdk_sessions_id_seq'::regclass);


--
-- Name: shared_tours id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_tours ALTER COLUMN id SET DEFAULT nextval('public.shared_tours_id_seq'::regclass);


--
-- Name: sitemaps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sitemaps ALTER COLUMN id SET DEFAULT nextval('public.sitemaps_id_seq'::regclass);


--
-- Name: statuses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.statuses ALTER COLUMN id SET DEFAULT nextval('public.statuses_id_seq'::regclass);


--
-- Name: stop_details id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stop_details ALTER COLUMN id SET DEFAULT nextval('public.stop_details_id_seq'::regclass);


--
-- Name: stop_galleries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stop_galleries ALTER COLUMN id SET DEFAULT nextval('public.stop_galleries_id_seq'::regclass);


--
-- Name: sub_communities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_communities ALTER COLUMN id SET DEFAULT nextval('public.sub_communities_id_seq'::regclass);


--
-- Name: svg_optimization_runs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.svg_optimization_runs ALTER COLUMN id SET DEFAULT nextval('public.svg_optimization_runs_id_seq'::regclass);


--
-- Name: temp_tables id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.temp_tables ALTER COLUMN id SET DEFAULT nextval('public.temp_tables_id_seq'::regclass);


--
-- Name: temporary_images id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.temporary_images ALTER COLUMN id SET DEFAULT nextval('public.temporary_images_id_seq'::regclass);


--
-- Name: three_d_maps_configurations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.three_d_maps_configurations ALTER COLUMN id SET DEFAULT nextval('public.three_d_maps_configurations_id_seq'::regclass);


--
-- Name: tour_histories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tour_histories ALTER COLUMN id SET DEFAULT nextval('public.tour_histories_id_seq'::regclass);


--
-- Name: tour_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tour_settings ALTER COLUMN id SET DEFAULT nextval('public.tour_settings_id_seq'::regclass);


--
-- Name: tour_stops id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tour_stops ALTER COLUMN id SET DEFAULT nextval('public.tour_stops_id_seq'::regclass);


--
-- Name: tour_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tour_users ALTER COLUMN id SET DEFAULT nextval('public.tour_users_id_seq'::regclass);


--
-- Name: tours id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tours ALTER COLUMN id SET DEFAULT nextval('public.tours_id_seq'::regclass);


--
-- Name: track_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.track_sessions ALTER COLUMN id SET DEFAULT nextval('public.track_sessions_id_seq'::regclass);


--
-- Name: tutorials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutorials ALTER COLUMN id SET DEFAULT nextval('public.tutorials_id_seq'::regclass);


--
-- Name: unit_elevators id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_elevators ALTER COLUMN id SET DEFAULT nextval('public.unit_elevators_id_seq'::regclass);


--
-- Name: unit_space_details id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_space_details ALTER COLUMN id SET DEFAULT nextval('public.unit_space_details_id_seq'::regclass);


--
-- Name: units id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.units ALTER COLUMN id SET DEFAULT nextval('public.units_id_seq'::regclass);


--
-- Name: user_stripes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_stripes ALTER COLUMN id SET DEFAULT nextval('public.user_stripes_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: versions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.versions ALTER COLUMN id SET DEFAULT nextval('public.versions_id_seq'::regclass);


--
-- Name: visited_stops id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visited_stops ALTER COLUMN id SET DEFAULT nextval('public.visited_stops_id_seq'::regclass);


--
-- Name: wayfinding_stops id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wayfinding_stops ALTER COLUMN id SET DEFAULT nextval('public.wayfinding_stops_id_seq'::regclass);


--
-- Name: web_hook_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.web_hook_logs ALTER COLUMN id SET DEFAULT nextval('public.web_hook_logs_id_seq'::regclass);


--
-- Name: webpages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webpages ALTER COLUMN id SET DEFAULT nextval('public.webpages_id_seq'::regclass);


--
-- Name: yales id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.yales ALTER COLUMN id SET DEFAULT nextval('public.yales_id_seq'::regclass);


--
-- Name: zerv_guests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zerv_guests ALTER COLUMN id SET DEFAULT nextval('public.zerv_guests_id_seq'::regclass);


--
-- Name: zerv_locks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zerv_locks ALTER COLUMN id SET DEFAULT nextval('public.zerv_locks_id_seq'::regclass);


--
-- Name: zervs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zervs ALTER COLUMN id SET DEFAULT nextval('public.zervs_id_seq'::regclass);


--
-- Name: access_logs access_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_logs
    ADD CONSTRAINT access_logs_pkey PRIMARY KEY (id);


--
-- Name: additional_files additional_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.additional_files
    ADD CONSTRAINT additional_files_pkey PRIMARY KEY (id);


--
-- Name: additional_images additional_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.additional_images
    ADD CONSTRAINT additional_images_pkey PRIMARY KEY (id);


--
-- Name: alert_messages alert_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_messages
    ADD CONSTRAINT alert_messages_pkey PRIMARY KEY (id);


--
-- Name: allowed_emails allowed_emails_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allowed_emails
    ADD CONSTRAINT allowed_emails_pkey PRIMARY KEY (id);


--
-- Name: amenities amenities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amenities
    ADD CONSTRAINT amenities_pkey PRIMARY KEY (id);


--
-- Name: amenity_galleries amenity_galleries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amenity_galleries
    ADD CONSTRAINT amenity_galleries_pkey PRIMARY KEY (id);


--
-- Name: app_versions app_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_versions
    ADD CONSTRAINT app_versions_pkey PRIMARY KEY (id);


--
-- Name: ar_internal_metadata ar_internal_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ar_internal_metadata
    ADD CONSTRAINT ar_internal_metadata_pkey PRIMARY KEY (key);


--
-- Name: as_guests as_guests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.as_guests
    ADD CONSTRAINT as_guests_pkey PRIMARY KEY (id);


--
-- Name: bedroom_marker_colors bedroom_marker_colors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bedroom_marker_colors
    ADD CONSTRAINT bedroom_marker_colors_pkey PRIMARY KEY (id);


--
-- Name: building_starting_points building_starting_points_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.building_starting_points
    ADD CONSTRAINT building_starting_points_pkey PRIMARY KEY (id);


--
-- Name: calculator_configs calculator_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calculator_configs
    ADD CONSTRAINT calculator_configs_pkey PRIMARY KEY (id);


--
-- Name: chatrooms chatrooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chatrooms
    ADD CONSTRAINT chatrooms_pkey PRIMARY KEY (id);


--
-- Name: chats chats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chats
    ADD CONSTRAINT chats_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: communities communities_highlight_all_units_on_hover_not_null; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.communities
    ADD CONSTRAINT communities_highlight_all_units_on_hover_not_null CHECK ((highlight_all_units_on_hover IS NOT NULL)) NOT VALID;


--
-- Name: communities communities_map_analytics_settings_not_null; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.communities
    ADD CONSTRAINT communities_map_analytics_settings_not_null CHECK ((map_analytics_settings IS NOT NULL)) NOT VALID;


--
-- Name: communities communities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communities
    ADD CONSTRAINT communities_pkey PRIMARY KEY (id);


--
-- Name: community_groups community_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_groups
    ADD CONSTRAINT community_groups_pkey PRIMARY KEY (id);


--
-- Name: community_users community_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_users
    ADD CONSTRAINT community_users_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: company_settings company_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_settings
    ADD CONSTRAINT company_settings_pkey PRIMARY KEY (id);


--
-- Name: credentials credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credentials
    ADD CONSTRAINT credentials_pkey PRIMARY KEY (id);


--
-- Name: crm_credentials crm_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_credentials
    ADD CONSTRAINT crm_credentials_pkey PRIMARY KEY (id);


--
-- Name: crm_discovery_sources crm_discovery_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_discovery_sources
    ADD CONSTRAINT crm_discovery_sources_pkey PRIMARY KEY (id);


--
-- Name: crm_time_slots crm_time_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_time_slots
    ADD CONSTRAINT crm_time_slots_pkey PRIMARY KEY (id);


--
-- Name: default_images default_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.default_images
    ADD CONSTRAINT default_images_pkey PRIMARY KEY (id);


--
-- Name: delayed_jobs delayed_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delayed_jobs
    ADD CONSTRAINT delayed_jobs_pkey PRIMARY KEY (id);


--
-- Name: design_directions design_directions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.design_directions
    ADD CONSTRAINT design_directions_pkey PRIMARY KEY (id);


--
-- Name: design_system_configs design_system_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.design_system_configs
    ADD CONSTRAINT design_system_configs_pkey PRIMARY KEY (id);


--
-- Name: designs designs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.designs
    ADD CONSTRAINT designs_pkey PRIMARY KEY (id);


--
-- Name: doors doors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doors
    ADD CONSTRAINT doors_pkey PRIMARY KEY (id);


--
-- Name: dwelos dwelos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dwelos
    ADD CONSTRAINT dwelos_pkey PRIMARY KEY (id);


--
-- Name: ebrochure_menu_buttons ebrochure_menu_buttons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ebrochure_menu_buttons
    ADD CONSTRAINT ebrochure_menu_buttons_pkey PRIMARY KEY (id);


--
-- Name: edge_states edge_states_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edge_states
    ADD CONSTRAINT edge_states_pkey PRIMARY KEY (id);


--
-- Name: elevator_banks elevator_banks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elevator_banks
    ADD CONSTRAINT elevator_banks_pkey PRIMARY KEY (id);


--
-- Name: elevator_galleries elevator_galleries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elevator_galleries
    ADD CONSTRAINT elevator_galleries_pkey PRIMARY KEY (id);


--
-- Name: elevators elevators_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elevators
    ADD CONSTRAINT elevators_pkey PRIMARY KEY (id);


--
-- Name: expressionists expressionists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expressionists
    ADD CONSTRAINT expressionists_pkey PRIMARY KEY (id);


--
-- Name: favorite_images favorite_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_images
    ADD CONSTRAINT favorite_images_pkey PRIMARY KEY (id);


--
-- Name: favorite_settings favorite_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_settings
    ADD CONSTRAINT favorite_settings_pkey PRIMARY KEY (id);


--
-- Name: favorite_stops favorite_stops_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_stops
    ADD CONSTRAINT favorite_stops_pkey PRIMARY KEY (id);


--
-- Name: favorites favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (id);


--
-- Name: feedbacks feedbacks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedbacks
    ADD CONSTRAINT feedbacks_pkey PRIMARY KEY (id);


--
-- Name: filter_panels filter_panels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.filter_panels
    ADD CONSTRAINT filter_panels_pkey PRIMARY KEY (id);


--
-- Name: floorplans floorplans_expand_description_in_popup_not_null; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.floorplans
    ADD CONSTRAINT floorplans_expand_description_in_popup_not_null CHECK ((expand_description_in_popup IS NOT NULL)) NOT VALID;


--
-- Name: floorplans floorplans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.floorplans
    ADD CONSTRAINT floorplans_pkey PRIMARY KEY (id);


--
-- Name: floorplans floorplans_show_description_on_card_not_null; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.floorplans
    ADD CONSTRAINT floorplans_show_description_on_card_not_null CHECK ((show_description_on_card IS NOT NULL)) NOT VALID;


--
-- Name: floorplates floorplates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.floorplates
    ADD CONSTRAINT floorplates_pkey PRIMARY KEY (id);


--
-- Name: font_settings font_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.font_settings
    ADD CONSTRAINT font_settings_pkey PRIMARY KEY (id);


--
-- Name: gables gables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gables
    ADD CONSTRAINT gables_pkey PRIMARY KEY (id);


--
-- Name: galleries galleries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.galleries
    ADD CONSTRAINT galleries_pkey PRIMARY KEY (id);


--
-- Name: gallery_images gallery_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gallery_images
    ADD CONSTRAINT gallery_images_pkey PRIMARY KEY (id);


--
-- Name: group_designs group_designs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_designs
    ADD CONSTRAINT group_designs_pkey PRIMARY KEY (id);


--
-- Name: group_homepage_images group_homepage_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_homepage_images
    ADD CONSTRAINT group_homepage_images_pkey PRIMARY KEY (id);


--
-- Name: group_homepage_videos group_homepage_videos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_homepage_videos
    ADD CONSTRAINT group_homepage_videos_pkey PRIMARY KEY (id);


--
-- Name: guided_opening_hours guided_opening_hours_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guided_opening_hours
    ADD CONSTRAINT guided_opening_hours_pkey PRIMARY KEY (id);


--
-- Name: hallway_attachments hallway_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hallway_attachments
    ADD CONSTRAINT hallway_attachments_pkey PRIMARY KEY (id);


--
-- Name: hallway_detection_runs hallway_detection_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hallway_detection_runs
    ADD CONSTRAINT hallway_detection_runs_pkey PRIMARY KEY (id);


--
-- Name: hallway_edges hallway_edges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hallway_edges
    ADD CONSTRAINT hallway_edges_pkey PRIMARY KEY (id);


--
-- Name: hallway_suppressions hallway_suppressions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hallway_suppressions
    ADD CONSTRAINT hallway_suppressions_pkey PRIMARY KEY (id);


--
-- Name: hallways hallways_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hallways
    ADD CONSTRAINT hallways_pkey PRIMARY KEY (id);


--
-- Name: hardware_specs hardware_specs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hardware_specs
    ADD CONSTRAINT hardware_specs_pkey PRIMARY KEY (id);


--
-- Name: home_page_images home_page_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.home_page_images
    ADD CONSTRAINT home_page_images_pkey PRIMARY KEY (id);


--
-- Name: home_page_videos home_page_videos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.home_page_videos
    ADD CONSTRAINT home_page_videos_pkey PRIMARY KEY (id);


--
-- Name: home_screens home_screens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.home_screens
    ADD CONSTRAINT home_screens_pkey PRIMARY KEY (id);


--
-- Name: homepage_icons homepage_icons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homepage_icons
    ADD CONSTRAINT homepage_icons_pkey PRIMARY KEY (id);


--
-- Name: igloo_guests igloo_guests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.igloo_guests
    ADD CONSTRAINT igloo_guests_pkey PRIMARY KEY (id);


--
-- Name: igloohome_guests igloohome_guests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.igloohome_guests
    ADD CONSTRAINT igloohome_guests_pkey PRIMARY KEY (id);


--
-- Name: igloohome_locks igloohome_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.igloohome_locks
    ADD CONSTRAINT igloohome_locks_pkey PRIMARY KEY (id);


--
-- Name: igloohomes igloohomes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.igloohomes
    ADD CONSTRAINT igloohomes_pkey PRIMARY KEY (id);


--
-- Name: imagepages imagepages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imagepages
    ADD CONSTRAINT imagepages_pkey PRIMARY KEY (id);


--
-- Name: impressions impressions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impressions
    ADD CONSTRAINT impressions_pkey PRIMARY KEY (id);


--
-- Name: latch_allowed_accesses latch_allowed_accesses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.latch_allowed_accesses
    ADD CONSTRAINT latch_allowed_accesses_pkey PRIMARY KEY (id);


--
-- Name: latch_auth_tokens latch_auth_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.latch_auth_tokens
    ADD CONSTRAINT latch_auth_tokens_pkey PRIMARY KEY (id);


--
-- Name: latch_guests latch_guests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.latch_guests
    ADD CONSTRAINT latch_guests_pkey PRIMARY KEY (id);


--
-- Name: latch_locks latch_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.latch_locks
    ADD CONSTRAINT latch_locks_pkey PRIMARY KEY (id);


--
-- Name: latches latches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.latches
    ADD CONSTRAINT latches_pkey PRIMARY KEY (id);


--
-- Name: launch_remotes launch_remotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.launch_remotes
    ADD CONSTRAINT launch_remotes_pkey PRIMARY KEY (id);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: lock_histories lock_histories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lock_histories
    ADD CONSTRAINT lock_histories_pkey PRIMARY KEY (id);


--
-- Name: main_screens main_screens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.main_screens
    ADD CONSTRAINT main_screens_pkey PRIMARY KEY (id);


--
-- Name: map_filters map_filters_marketing_floorplan_gallery_page_enabled_not_null; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.map_filters
    ADD CONSTRAINT map_filters_marketing_floorplan_gallery_page_enabled_not_null CHECK ((marketing_floorplan_gallery_page_enabled IS NOT NULL)) NOT VALID;


--
-- Name: map_filters map_filters_marketing_sort_enabled_not_null; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.map_filters
    ADD CONSTRAINT map_filters_marketing_sort_enabled_not_null CHECK ((marketing_sort_enabled IS NOT NULL)) NOT VALID;


--
-- Name: map_filters map_filters_ops_floorplan_gallery_page_enabled_not_null; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.map_filters
    ADD CONSTRAINT map_filters_ops_floorplan_gallery_page_enabled_not_null CHECK ((ops_floorplan_gallery_page_enabled IS NOT NULL)) NOT VALID;


--
-- Name: map_filters map_filters_ops_sort_enabled_not_null; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.map_filters
    ADD CONSTRAINT map_filters_ops_sort_enabled_not_null CHECK ((ops_sort_enabled IS NOT NULL)) NOT VALID;


--
-- Name: map_filters map_filters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.map_filters
    ADD CONSTRAINT map_filters_pkey PRIMARY KEY (id);


--
-- Name: map_partners map_partners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.map_partners
    ADD CONSTRAINT map_partners_pkey PRIMARY KEY (id);


--
-- Name: maps_positions maps_positions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maps_positions
    ADD CONSTRAINT maps_positions_pkey PRIMARY KEY (id);


--
-- Name: menus menus_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menus
    ADD CONSTRAINT menus_pkey PRIMARY KEY (id);


--
-- Name: neighborhoods neighborhoods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.neighborhoods
    ADD CONSTRAINT neighborhoods_pkey PRIMARY KEY (id);


--
-- Name: neighbour_units neighbour_units_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.neighbour_units
    ADD CONSTRAINT neighbour_units_pkey PRIMARY KEY (id);


--
-- Name: neighbourhood_logs neighbourhood_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.neighbourhood_logs
    ADD CONSTRAINT neighbourhood_logs_pkey PRIMARY KEY (id);


--
-- Name: oauth_access_grants oauth_access_grants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_access_grants
    ADD CONSTRAINT oauth_access_grants_pkey PRIMARY KEY (id);


--
-- Name: oauth_access_tokens oauth_access_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_access_tokens
    ADD CONSTRAINT oauth_access_tokens_pkey PRIMARY KEY (id);


--
-- Name: oauth_applications oauth_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_applications
    ADD CONSTRAINT oauth_applications_pkey PRIMARY KEY (id);


--
-- Name: opening_hours opening_hours_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opening_hours
    ADD CONSTRAINT opening_hours_pkey PRIMARY KEY (id);


--
-- Name: other_locks other_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.other_locks
    ADD CONSTRAINT other_locks_pkey PRIMARY KEY (id);


--
-- Name: partner_events partner_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_events
    ADD CONSTRAINT partner_events_pkey PRIMARY KEY (id);


--
-- Name: partners partners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partners
    ADD CONSTRAINT partners_pkey PRIMARY KEY (id);


--
-- Name: path_points path_points_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.path_points
    ADD CONSTRAINT path_points_pkey PRIMARY KEY (id);


--
-- Name: paths paths_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paths
    ADD CONSTRAINT paths_pkey PRIMARY KEY (id);


--
-- Name: portal_tour_stop_galleries portal_tour_stop_galleries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_tour_stop_galleries
    ADD CONSTRAINT portal_tour_stop_galleries_pkey PRIMARY KEY (id);


--
-- Name: portal_tour_stops portal_tour_stops_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_tour_stops
    ADD CONSTRAINT portal_tour_stops_pkey PRIMARY KEY (id);


--
-- Name: portal_tours portal_tours_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_tours
    ADD CONSTRAINT portal_tours_pkey PRIMARY KEY (id);


--
-- Name: prospects prospects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prospects
    ADD CONSTRAINT prospects_pkey PRIMARY KEY (id);


--
-- Name: pynwheel_access_users pynwheel_access_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pynwheel_access_users
    ADD CONSTRAINT pynwheel_access_users_pkey PRIMARY KEY (id);


--
-- Name: read_marks read_marks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.read_marks
    ADD CONSTRAINT read_marks_pkey PRIMARY KEY (id);


--
-- Name: regions regions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_pkey PRIMARY KEY (id);


--
-- Name: remote_locks remote_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.remote_locks
    ADD CONSTRAINT remote_locks_pkey PRIMARY KEY (id);


--
-- Name: resident_access_points resident_access_points_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resident_access_points
    ADD CONSTRAINT resident_access_points_pkey PRIMARY KEY (id);


--
-- Name: schedual_tours schedual_tours_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedual_tours
    ADD CONSTRAINT schedual_tours_pkey PRIMARY KEY (id);


--
-- Name: scheduler_widget_settings scheduler_widget_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduler_widget_settings
    ADD CONSTRAINT scheduler_widget_settings_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: schlages schlages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schlages
    ADD CONSTRAINT schlages_pkey PRIMARY KEY (id);


--
-- Name: sdk_events sdk_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sdk_events
    ADD CONSTRAINT sdk_events_pkey PRIMARY KEY (id);


--
-- Name: sdk_sessions sdk_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sdk_sessions
    ADD CONSTRAINT sdk_sessions_pkey PRIMARY KEY (id);


--
-- Name: shared_tours shared_tours_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_tours
    ADD CONSTRAINT shared_tours_pkey PRIMARY KEY (id);


--
-- Name: sitemaps sitemaps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sitemaps
    ADD CONSTRAINT sitemaps_pkey PRIMARY KEY (id);


--
-- Name: statuses statuses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.statuses
    ADD CONSTRAINT statuses_pkey PRIMARY KEY (id);


--
-- Name: stop_details stop_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stop_details
    ADD CONSTRAINT stop_details_pkey PRIMARY KEY (id);


--
-- Name: stop_galleries stop_galleries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stop_galleries
    ADD CONSTRAINT stop_galleries_pkey PRIMARY KEY (id);


--
-- Name: sub_communities sub_communities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_communities
    ADD CONSTRAINT sub_communities_pkey PRIMARY KEY (id);


--
-- Name: svg_optimization_runs svg_optimization_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.svg_optimization_runs
    ADD CONSTRAINT svg_optimization_runs_pkey PRIMARY KEY (id);


--
-- Name: temp_tables temp_tables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.temp_tables
    ADD CONSTRAINT temp_tables_pkey PRIMARY KEY (id);


--
-- Name: temporary_images temporary_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.temporary_images
    ADD CONSTRAINT temporary_images_pkey PRIMARY KEY (id);


--
-- Name: three_d_maps_configurations three_d_maps_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.three_d_maps_configurations
    ADD CONSTRAINT three_d_maps_configurations_pkey PRIMARY KEY (id);


--
-- Name: tour_histories tour_histories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tour_histories
    ADD CONSTRAINT tour_histories_pkey PRIMARY KEY (id);


--
-- Name: tour_settings tour_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tour_settings
    ADD CONSTRAINT tour_settings_pkey PRIMARY KEY (id);


--
-- Name: tour_stops tour_stops_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tour_stops
    ADD CONSTRAINT tour_stops_pkey PRIMARY KEY (id);


--
-- Name: tour_users tour_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tour_users
    ADD CONSTRAINT tour_users_pkey PRIMARY KEY (id);


--
-- Name: tours tours_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tours
    ADD CONSTRAINT tours_pkey PRIMARY KEY (id);


--
-- Name: track_sessions track_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.track_sessions
    ADD CONSTRAINT track_sessions_pkey PRIMARY KEY (id);


--
-- Name: tutorials tutorials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutorials
    ADD CONSTRAINT tutorials_pkey PRIMARY KEY (id);


--
-- Name: unit_elevators unit_elevators_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_elevators
    ADD CONSTRAINT unit_elevators_pkey PRIMARY KEY (id);


--
-- Name: unit_space_details unit_space_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_space_details
    ADD CONSTRAINT unit_space_details_pkey PRIMARY KEY (id);


--
-- Name: units units_expand_description_in_popup_not_null; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.units
    ADD CONSTRAINT units_expand_description_in_popup_not_null CHECK ((expand_description_in_popup IS NOT NULL)) NOT VALID;


--
-- Name: units units_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_pkey PRIMARY KEY (id);


--
-- Name: user_stripes user_stripes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_stripes
    ADD CONSTRAINT user_stripes_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: visited_stops visited_stops_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visited_stops
    ADD CONSTRAINT visited_stops_pkey PRIMARY KEY (id);


--
-- Name: wayfinding_stops wayfinding_stops_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wayfinding_stops
    ADD CONSTRAINT wayfinding_stops_pkey PRIMARY KEY (id);


--
-- Name: web_hook_logs web_hook_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.web_hook_logs
    ADD CONSTRAINT web_hook_logs_pkey PRIMARY KEY (id);


--
-- Name: webpages webpages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webpages
    ADD CONSTRAINT webpages_pkey PRIMARY KEY (id);


--
-- Name: yales yales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.yales
    ADD CONSTRAINT yales_pkey PRIMARY KEY (id);


--
-- Name: zerv_guests zerv_guests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zerv_guests
    ADD CONSTRAINT zerv_guests_pkey PRIMARY KEY (id);


--
-- Name: zerv_locks zerv_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zerv_locks
    ADD CONSTRAINT zerv_locks_pkey PRIMARY KEY (id);


--
-- Name: zervs zervs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zervs
    ADD CONSTRAINT zervs_pkey PRIMARY KEY (id);


--
-- Name: delayed_jobs_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX delayed_jobs_priority ON public.delayed_jobs USING btree (priority, run_at);


--
-- Name: idx_communities_map_analytics_data_layer_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_communities_map_analytics_data_layer_enabled ON public.communities USING btree ((((map_analytics_settings -> 'data_layer'::text) ->> 'enabled'::text))) WHERE (((map_analytics_settings -> 'data_layer'::text) ->> 'enabled'::text) = 'true'::text);


--
-- Name: idx_on_parent_type_parent_id_kind_4f50b557e9; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_on_parent_type_parent_id_kind_4f50b557e9 ON public.hallway_suppressions USING btree (parent_type, parent_id, kind);


--
-- Name: idx_sdk_events_community_action_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sdk_events_community_action_time ON public.sdk_events USING btree (community_id, action, occurred_at);


--
-- Name: idx_sdk_events_community_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sdk_events_community_time ON public.sdk_events USING btree (community_id, occurred_at);


--
-- Name: idx_sdk_events_company_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sdk_events_company_time ON public.sdk_events USING btree (company_id, occurred_at);


--
-- Name: idx_sdk_events_session_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sdk_events_session_time ON public.sdk_events USING btree (sdk_session_id, occurred_at);


--
-- Name: idx_sdk_events_time_brin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sdk_events_time_brin ON public.sdk_events USING brin (occurred_at);


--
-- Name: idx_sdk_events_visitor_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sdk_events_visitor_time ON public.sdk_events USING btree (parent_sdk_session_id, occurred_at);


--
-- Name: idx_sdk_sessions_community_type_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sdk_sessions_community_type_date ON public.sdk_sessions USING btree (community_id, client_type, start_datetime);


--
-- Name: idx_sdk_sessions_device_context_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sdk_sessions_device_context_gin ON public.sdk_sessions USING gin (device_context);


--
-- Name: idx_sdk_sessions_events_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sdk_sessions_events_gin ON public.sdk_sessions USING gin (events);


--
-- Name: idx_sdk_sessions_parent_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sdk_sessions_parent_date ON public.sdk_sessions USING btree (parent_sdk_session_id, start_datetime);


--
-- Name: idx_sdk_sessions_partner_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sdk_sessions_partner_date ON public.sdk_sessions USING btree (partner, start_datetime);


--
-- Name: idx_sdk_sessions_session_community_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sdk_sessions_session_community_date ON public.sdk_sessions USING btree (session_id, community_id, start_datetime);


--
-- Name: index_additional_files_on_imagepage_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_additional_files_on_imagepage_id ON public.additional_files USING btree (imagepage_id);


--
-- Name: index_additional_images_on_imagepage_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_additional_images_on_imagepage_id ON public.additional_images USING btree (imagepage_id);


--
-- Name: index_allowed_emails_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_allowed_emails_on_community_id ON public.allowed_emails USING btree (community_id);


--
-- Name: index_amenities_on_amenityable_type_and_amenityable_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_amenities_on_amenityable_type_and_amenityable_id ON public.amenities USING btree (amenityable_type, amenityable_id);


--
-- Name: index_amenities_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_amenities_on_community_id ON public.amenities USING btree (community_id);


--
-- Name: index_amenity_galleries_on_amenity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_amenity_galleries_on_amenity_id ON public.amenity_galleries USING btree (amenity_id);


--
-- Name: index_as_guests_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_as_guests_on_community_id ON public.as_guests USING btree (community_id);


--
-- Name: index_as_guests_on_pynwheel_access_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_as_guests_on_pynwheel_access_user_id ON public.as_guests USING btree (pynwheel_access_user_id);


--
-- Name: index_as_guests_on_tour_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_as_guests_on_tour_user_id ON public.as_guests USING btree (tour_user_id);


--
-- Name: index_bedroom_marker_colors_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_bedroom_marker_colors_on_community_id ON public.bedroom_marker_colors USING btree (community_id);


--
-- Name: index_bedroom_marker_colors_on_community_id_and_bedroom; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_bedroom_marker_colors_on_community_id_and_bedroom ON public.bedroom_marker_colors USING btree (community_id, bedroom);


--
-- Name: index_building_starting_points_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_building_starting_points_on_community_id ON public.building_starting_points USING btree (community_id);


--
-- Name: index_calculator_configs_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_calculator_configs_on_community_id ON public.calculator_configs USING btree (community_id);


--
-- Name: index_calculator_configs_on_config_json; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_calculator_configs_on_config_json ON public.calculator_configs USING gin (config_json);


--
-- Name: index_chatrooms_on_tour_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_chatrooms_on_tour_id ON public.chatrooms USING btree (tour_id);


--
-- Name: index_chatrooms_on_tour_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_chatrooms_on_tour_user_id ON public.chatrooms USING btree (tour_user_id);


--
-- Name: index_chats_on_chatroom_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_chats_on_chatroom_id ON public.chats USING btree (chatroom_id);


--
-- Name: index_communities_on_community_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_communities_on_community_group_id ON public.communities USING btree (community_group_id);


--
-- Name: index_communities_on_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_communities_on_company_id ON public.communities USING btree (company_id);


--
-- Name: index_communities_on_partner_map_settings; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_communities_on_partner_map_settings ON public.communities USING gin (partner_map_settings);


--
-- Name: index_communities_on_region_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_communities_on_region_id ON public.communities USING btree (region_id);


--
-- Name: index_community_groups_on_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_community_groups_on_company_id ON public.community_groups USING btree (company_id);


--
-- Name: index_community_groups_on_region_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_community_groups_on_region_id ON public.community_groups USING btree (region_id);


--
-- Name: index_community_users_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_community_users_on_community_id ON public.community_users USING btree (community_id);


--
-- Name: index_community_users_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_community_users_on_user_id ON public.community_users USING btree (user_id);


--
-- Name: index_company_settings_on_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_company_settings_on_company_id ON public.company_settings USING btree (company_id);


--
-- Name: index_credentials_on_app_folio_property_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_credentials_on_app_folio_property_scope ON public.credentials USING btree (app_folio_property_scope);


--
-- Name: index_credentials_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_credentials_on_community_id ON public.credentials USING btree (community_id);


--
-- Name: index_credentials_on_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_credentials_on_company_id ON public.credentials USING btree (company_id);


--
-- Name: index_crm_credentials_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_crm_credentials_on_community_id ON public.crm_credentials USING btree (community_id);


--
-- Name: index_crm_discovery_sources_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_crm_discovery_sources_on_community_id ON public.crm_discovery_sources USING btree (community_id);


--
-- Name: index_crm_time_slots_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_crm_time_slots_on_community_id ON public.crm_time_slots USING btree (community_id);


--
-- Name: index_design_directions_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_design_directions_on_community_id ON public.design_directions USING btree (community_id);


--
-- Name: index_design_system_configs_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_design_system_configs_on_community_id ON public.design_system_configs USING btree (community_id);


--
-- Name: index_doors_on_attached_with_type_and_attached_with_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_doors_on_attached_with_type_and_attached_with_id ON public.doors USING btree (attached_with_type, attached_with_id);


--
-- Name: index_doors_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_doors_on_community_id ON public.doors USING btree (community_id);


--
-- Name: index_dwelos_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_dwelos_on_community_id ON public.dwelos USING btree (community_id);


--
-- Name: index_edge_states_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_edge_states_on_community_id ON public.edge_states USING btree (community_id);


--
-- Name: index_elevator_banks_on_elevator_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_elevator_banks_on_elevator_id ON public.elevator_banks USING btree (elevator_id);


--
-- Name: index_elevator_galleries_on_elevator_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_elevator_galleries_on_elevator_id ON public.elevator_galleries USING btree (elevator_id);


--
-- Name: index_elevators_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_elevators_on_community_id ON public.elevators USING btree (community_id);


--
-- Name: index_elevators_on_community_id_and_kind; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_elevators_on_community_id_and_kind ON public.elevators USING btree (community_id, kind);


--
-- Name: index_elevators_on_floorplate_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_elevators_on_floorplate_id ON public.elevators USING btree (floorplate_id);


--
-- Name: index_elevators_on_sitemap_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_elevators_on_sitemap_id ON public.elevators USING btree (sitemap_id);


--
-- Name: index_favorite_images_on_favorite_setting_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_favorite_images_on_favorite_setting_id ON public.favorite_images USING btree (favorite_setting_id);


--
-- Name: index_favorite_settings_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_favorite_settings_on_community_id ON public.favorite_settings USING btree (community_id);


--
-- Name: index_favorite_stops_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_favorite_stops_on_community_id ON public.favorite_stops USING btree (community_id);


--
-- Name: index_favorites_on_session_id_and_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_favorites_on_session_id_and_community_id ON public.favorites USING btree (session_id, community_id);


--
-- Name: index_feedbacks_on_tour_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_feedbacks_on_tour_id ON public.feedbacks USING btree (tour_id);


--
-- Name: index_feedbacks_on_tour_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_feedbacks_on_tour_user_id ON public.feedbacks USING btree (tour_user_id);


--
-- Name: index_floorplans_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_floorplans_on_community_id ON public.floorplans USING btree (community_id);


--
-- Name: index_floorplates_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_floorplates_on_community_id ON public.floorplates USING btree (community_id);


--
-- Name: index_font_settings_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_font_settings_on_community_id ON public.font_settings USING btree (community_id);


--
-- Name: index_galleries_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_galleries_on_community_id ON public.galleries USING btree (community_id);


--
-- Name: index_gallery_images_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_gallery_images_on_community_id ON public.gallery_images USING btree (community_id);


--
-- Name: index_gallery_images_on_gallery_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_gallery_images_on_gallery_id ON public.gallery_images USING btree (gallery_id);


--
-- Name: index_group_designs_on_community_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_group_designs_on_community_group_id ON public.group_designs USING btree (community_group_id);


--
-- Name: index_group_homepage_images_on_group_design_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_group_homepage_images_on_group_design_id ON public.group_homepage_images USING btree (group_design_id);


--
-- Name: index_group_homepage_videos_on_group_design_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_group_homepage_videos_on_group_design_id ON public.group_homepage_videos USING btree (group_design_id);


--
-- Name: index_guided_opening_hours_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_guided_opening_hours_on_community_id ON public.guided_opening_hours USING btree (community_id);


--
-- Name: index_hallway_attachments_on_hallway_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_hallway_attachments_on_hallway_id ON public.hallway_attachments USING btree (hallway_id);


--
-- Name: index_hallway_attachments_on_parent_type_and_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_hallway_attachments_on_parent_type_and_parent_id ON public.hallway_attachments USING btree (parent_type, parent_id);


--
-- Name: index_hallway_attachments_unique_per_level; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_hallway_attachments_unique_per_level ON public.hallway_attachments USING btree (attachable_type, attachable_id, parent_type, parent_id);


--
-- Name: index_hallway_detection_runs_on_client_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_hallway_detection_runs_on_client_request_id ON public.hallway_detection_runs USING btree (client_request_id);


--
-- Name: index_hallway_detection_runs_on_parent_type_and_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_hallway_detection_runs_on_parent_type_and_parent_id ON public.hallway_detection_runs USING btree (parent_type, parent_id);


--
-- Name: index_hallway_edges_on_detection_run_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_hallway_edges_on_detection_run_id ON public.hallway_edges USING btree (detection_run_id);


--
-- Name: index_hallway_edges_on_from_hallway_id_and_to_hallway_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_hallway_edges_on_from_hallway_id_and_to_hallway_id ON public.hallway_edges USING btree (from_hallway_id, to_hallway_id);


--
-- Name: index_hallway_edges_on_parent_type_and_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_hallway_edges_on_parent_type_and_parent_id ON public.hallway_edges USING btree (parent_type, parent_id);


--
-- Name: index_hallway_edges_on_to_hallway_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_hallway_edges_on_to_hallway_id ON public.hallway_edges USING btree (to_hallway_id);


--
-- Name: index_hallways_natural_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_hallways_natural_key ON public.hallways USING btree (parent_type, parent_id, space, ((round(x_plot))::integer), ((round(y_plot))::integer));


--
-- Name: index_hallways_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_hallways_on_community_id ON public.hallways USING btree (community_id);


--
-- Name: index_hallways_on_parent_type_and_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_hallways_on_parent_type_and_parent_id ON public.hallways USING btree (parent_type, parent_id);


--
-- Name: index_hallways_routable_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_hallways_routable_lookup ON public.hallways USING btree (parent_type, parent_id, review_status, space);


--
-- Name: index_hardware_specs_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_hardware_specs_on_community_id ON public.hardware_specs USING btree (community_id);


--
-- Name: index_homepage_icons_on_design_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_homepage_icons_on_design_id ON public.homepage_icons USING btree (design_id);


--
-- Name: index_igloo_guests_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_igloo_guests_on_community_id ON public.igloo_guests USING btree (community_id);


--
-- Name: index_igloo_guests_on_pynwheel_access_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_igloo_guests_on_pynwheel_access_user_id ON public.igloo_guests USING btree (pynwheel_access_user_id);


--
-- Name: index_igloo_guests_on_tour_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_igloo_guests_on_tour_user_id ON public.igloo_guests USING btree (tour_user_id);


--
-- Name: index_igloohome_guest_of_stop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_igloohome_guest_of_stop ON public.igloohome_guests USING btree (guest_of_stop_type, guest_of_stop_id);


--
-- Name: index_igloohome_guests_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_igloohome_guests_on_community_id ON public.igloohome_guests USING btree (community_id);


--
-- Name: index_igloohome_guests_on_tour_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_igloohome_guests_on_tour_user_id ON public.igloohome_guests USING btree (tour_user_id);


--
-- Name: index_igloohome_locks_on_igloohome_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_igloohome_locks_on_igloohome_id ON public.igloohome_locks USING btree (igloohome_id);


--
-- Name: index_igloohome_locks_on_stop_type_and_stop_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_igloohome_locks_on_stop_type_and_stop_id ON public.igloohome_locks USING btree (stop_type, stop_id);


--
-- Name: index_igloohomes_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_igloohomes_on_community_id ON public.igloohomes USING btree (community_id);


--
-- Name: index_imagepages_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_imagepages_on_community_id ON public.imagepages USING btree (community_id);


--
-- Name: index_impressions_on_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_impressions_on_enabled ON public.impressions USING btree (enabled);


--
-- Name: index_impressions_on_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_impressions_on_request_id ON public.impressions USING btree (request_id);


--
-- Name: index_latch_allowed_accesses_on_latch_guest_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_latch_allowed_accesses_on_latch_guest_id ON public.latch_allowed_accesses USING btree (latch_guest_id);


--
-- Name: index_latch_allowed_accesses_on_stop_type_and_stop_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_latch_allowed_accesses_on_stop_type_and_stop_id ON public.latch_allowed_accesses USING btree (stop_type, stop_id);


--
-- Name: index_latch_auth_tokens_on_tour_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_latch_auth_tokens_on_tour_user_id ON public.latch_auth_tokens USING btree (tour_user_id);


--
-- Name: index_latch_guests_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_latch_guests_on_community_id ON public.latch_guests USING btree (community_id);


--
-- Name: index_latch_guests_on_guest_of_stop_type_and_guest_of_stop_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_latch_guests_on_guest_of_stop_type_and_guest_of_stop_id ON public.latch_guests USING btree (guest_of_stop_type, guest_of_stop_id);


--
-- Name: index_latch_guests_on_pynwheel_access_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_latch_guests_on_pynwheel_access_user_id ON public.latch_guests USING btree (pynwheel_access_user_id);


--
-- Name: index_latch_guests_on_tour_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_latch_guests_on_tour_user_id ON public.latch_guests USING btree (tour_user_id);


--
-- Name: index_latch_locks_on_latch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_latch_locks_on_latch_id ON public.latch_locks USING btree (latch_id);


--
-- Name: index_latch_locks_on_stop_type_and_stop_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_latch_locks_on_stop_type_and_stop_id ON public.latch_locks USING btree (stop_type, stop_id);


--
-- Name: index_latches_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_latches_on_community_id ON public.latches USING btree (community_id);


--
-- Name: index_launch_remotes_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_launch_remotes_on_community_id ON public.launch_remotes USING btree (community_id);


--
-- Name: index_locations_on_neighborhood_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_locations_on_neighborhood_id ON public.locations USING btree (neighborhood_id);


--
-- Name: index_lock_histories_on_tour_history_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_lock_histories_on_tour_history_id ON public.lock_histories USING btree (tour_history_id);


--
-- Name: index_lock_histories_on_tour_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_lock_histories_on_tour_user_id ON public.lock_histories USING btree (tour_user_id);


--
-- Name: index_map_filters_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_map_filters_on_community_id ON public.map_filters USING btree (community_id);


--
-- Name: index_map_partners_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_map_partners_on_community_id ON public.map_partners USING btree (community_id);


--
-- Name: index_map_partners_on_community_partner_api_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_map_partners_on_community_partner_api_key ON public.map_partners USING btree (community_id, partner, api_key);


--
-- Name: index_maps_positions_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_maps_positions_on_community_id ON public.maps_positions USING btree (community_id);


--
-- Name: index_maps_positions_on_floorplate_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_maps_positions_on_floorplate_id ON public.maps_positions USING btree (floorplate_id);


--
-- Name: index_maps_positions_on_sitemap_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_maps_positions_on_sitemap_id ON public.maps_positions USING btree (sitemap_id);


--
-- Name: index_neighborhoods_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_neighborhoods_on_community_id ON public.neighborhoods USING btree (community_id);


--
-- Name: index_neighbour_units_on_path_point_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_neighbour_units_on_path_point_id ON public.neighbour_units USING btree (path_point_id);


--
-- Name: index_oauth_access_grants_on_application_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_oauth_access_grants_on_application_id ON public.oauth_access_grants USING btree (application_id);


--
-- Name: index_oauth_access_grants_on_resource_owner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_oauth_access_grants_on_resource_owner_id ON public.oauth_access_grants USING btree (resource_owner_id);


--
-- Name: index_oauth_access_grants_on_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_oauth_access_grants_on_token ON public.oauth_access_grants USING btree (token);


--
-- Name: index_oauth_access_tokens_on_application_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_oauth_access_tokens_on_application_id ON public.oauth_access_tokens USING btree (application_id);


--
-- Name: index_oauth_access_tokens_on_refresh_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_oauth_access_tokens_on_refresh_token ON public.oauth_access_tokens USING btree (refresh_token);


--
-- Name: index_oauth_access_tokens_on_resource_owner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_oauth_access_tokens_on_resource_owner_id ON public.oauth_access_tokens USING btree (resource_owner_id);


--
-- Name: index_oauth_access_tokens_on_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_oauth_access_tokens_on_token ON public.oauth_access_tokens USING btree (token);


--
-- Name: index_oauth_applications_on_uid; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_oauth_applications_on_uid ON public.oauth_applications USING btree (uid);


--
-- Name: index_opening_hours_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_opening_hours_on_community_id ON public.opening_hours USING btree (community_id);


--
-- Name: index_other_locks_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_other_locks_on_community_id ON public.other_locks USING btree (community_id);


--
-- Name: index_partner_events_on_partner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_partner_events_on_partner_id ON public.partner_events USING btree (partner_id);


--
-- Name: index_partner_events_on_partner_id_and_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_partner_events_on_partner_id_and_created_at ON public.partner_events USING btree (partner_id, created_at);


--
-- Name: index_partner_events_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_partner_events_on_user_id ON public.partner_events USING btree (user_id);


--
-- Name: index_partners_on_active_and_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_partners_on_active_and_position ON public.partners USING btree (active, "position");


--
-- Name: index_partners_on_api_key_digest; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_partners_on_api_key_digest ON public.partners USING btree (api_key_digest) WHERE (api_key_digest IS NOT NULL);


--
-- Name: index_partners_on_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_partners_on_key ON public.partners USING btree (key);


--
-- Name: index_path_points_on_path_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_path_points_on_path_id ON public.path_points USING btree (path_id);


--
-- Name: index_paths_on_map_path_from_type_and_map_path_from_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_paths_on_map_path_from_type_and_map_path_from_id ON public.paths USING btree (map_path_from_type, map_path_from_id);


--
-- Name: index_paths_on_map_path_to_type_and_map_path_to_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_paths_on_map_path_to_type_and_map_path_to_id ON public.paths USING btree (map_path_to_type, map_path_to_id);


--
-- Name: index_prospects_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_prospects_on_community_id ON public.prospects USING btree (community_id);


--
-- Name: index_prospects_on_tour_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_prospects_on_tour_user_id ON public.prospects USING btree (tour_user_id);


--
-- Name: index_pynwheel_access_users_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_pynwheel_access_users_on_community_id ON public.pynwheel_access_users USING btree (community_id);


--
-- Name: index_read_marks_on_readable_type_and_readable_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_read_marks_on_readable_type_and_readable_id ON public.read_marks USING btree (readable_type, readable_id);


--
-- Name: index_read_marks_on_reader_type_and_reader_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_read_marks_on_reader_type_and_reader_id ON public.read_marks USING btree (reader_type, reader_id);


--
-- Name: index_regions_on_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_regions_on_company_id ON public.regions USING btree (company_id);


--
-- Name: index_remote_locks_on_dwelo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_remote_locks_on_dwelo_id ON public.remote_locks USING btree (dwelo_id);


--
-- Name: index_remote_locks_on_edge_state_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_remote_locks_on_edge_state_id ON public.remote_locks USING btree (edge_state_id);


--
-- Name: index_resident_access_points_on_pynwheel_access_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_resident_access_points_on_pynwheel_access_user_id ON public.resident_access_points USING btree (pynwheel_access_user_id);


--
-- Name: index_schedual_tours_on_tour_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_schedual_tours_on_tour_id ON public.schedual_tours USING btree (tour_id);


--
-- Name: index_schedual_tours_on_tour_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_schedual_tours_on_tour_user_id ON public.schedual_tours USING btree (tour_user_id);


--
-- Name: index_scheduler_widget_settings_on_tour_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_scheduler_widget_settings_on_tour_id ON public.scheduler_widget_settings USING btree (tour_id);


--
-- Name: index_schlages_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_schlages_on_community_id ON public.schlages USING btree (community_id);


--
-- Name: index_shared_tours_on_tour_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_shared_tours_on_tour_id ON public.shared_tours USING btree (tour_id);


--
-- Name: index_sitemaps_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_sitemaps_on_community_id ON public.sitemaps USING btree (community_id);


--
-- Name: index_statuses_on_statusable; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_statuses_on_statusable ON public.statuses USING btree (statusable_type, statusable_id);


--
-- Name: index_stop_details_on_tour_stop_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_stop_details_on_tour_stop_id ON public.stop_details USING btree (tour_stop_id);


--
-- Name: index_stop_galleries_on_tour_stop_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_stop_galleries_on_tour_stop_id ON public.stop_galleries USING btree (tour_stop_id);


--
-- Name: index_sub_communities_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_sub_communities_on_community_id ON public.sub_communities USING btree (community_id);


--
-- Name: index_svg_optimization_runs_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_svg_optimization_runs_on_community_id ON public.svg_optimization_runs USING btree (community_id);


--
-- Name: index_svg_optimization_runs_on_reverts_run_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_svg_optimization_runs_on_reverts_run_id ON public.svg_optimization_runs USING btree (reverts_run_id);


--
-- Name: index_svg_optimization_runs_on_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_svg_optimization_runs_on_status ON public.svg_optimization_runs USING btree (status);


--
-- Name: index_svg_optimization_runs_on_target_type_and_target_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_svg_optimization_runs_on_target_type_and_target_id ON public.svg_optimization_runs USING btree (target_type, target_id);


--
-- Name: index_three_d_maps_configurations_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_three_d_maps_configurations_on_community_id ON public.three_d_maps_configurations USING btree (community_id);


--
-- Name: index_tour_histories_on_tour_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_tour_histories_on_tour_user_id ON public.tour_histories USING btree (tour_user_id);


--
-- Name: index_tour_settings_on_tour_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_tour_settings_on_tour_id ON public.tour_settings USING btree (tour_id);


--
-- Name: index_tour_stops_on_stop_type_and_stop_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_tour_stops_on_stop_type_and_stop_id ON public.tour_stops USING btree (stop_type, stop_id);


--
-- Name: index_tour_stops_on_tour_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_tour_stops_on_tour_id ON public.tour_stops USING btree (tour_id);


--
-- Name: index_tours_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_tours_on_community_id ON public.tours USING btree (community_id);


--
-- Name: index_tours_on_tour_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_tours_on_tour_user_id ON public.tours USING btree (tour_user_id);


--
-- Name: index_track_sessions_on_amenity_marker_clicks; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_track_sessions_on_amenity_marker_clicks ON public.track_sessions USING btree (amenity_marker_clicks);


--
-- Name: index_track_sessions_on_amenity_marker_hovers; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_track_sessions_on_amenity_marker_hovers ON public.track_sessions USING btree (amenity_marker_hovers);


--
-- Name: index_track_sessions_on_availability_filter_clicks; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_track_sessions_on_availability_filter_clicks ON public.track_sessions USING btree (availability_filter_clicks);


--
-- Name: index_track_sessions_on_bedroom_filter_clicks; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_track_sessions_on_bedroom_filter_clicks ON public.track_sessions USING btree (bedroom_filter_clicks);


--
-- Name: index_track_sessions_on_clear_favorites_clicks; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_track_sessions_on_clear_favorites_clicks ON public.track_sessions USING btree (clear_favorites_clicks);


--
-- Name: index_track_sessions_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_track_sessions_on_community_id ON public.track_sessions USING btree (community_id);


--
-- Name: index_track_sessions_on_floor_number_clicks; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_track_sessions_on_floor_number_clicks ON public.track_sessions USING btree (floor_number_clicks);


--
-- Name: index_track_sessions_on_hide_pricing_matrix_clicks; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_track_sessions_on_hide_pricing_matrix_clicks ON public.track_sessions USING btree (hide_pricing_matrix_clicks);


--
-- Name: index_track_sessions_on_logo_clicks; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_track_sessions_on_logo_clicks ON public.track_sessions USING btree (logo_clicks);


--
-- Name: index_track_sessions_on_map_interactions; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_track_sessions_on_map_interactions ON public.track_sessions USING btree (map_interactions);


--
-- Name: index_track_sessions_on_open_pricing_matrix_clicks; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_track_sessions_on_open_pricing_matrix_clicks ON public.track_sessions USING btree (open_pricing_matrix_clicks);


--
-- Name: index_track_sessions_on_other_clicks; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_track_sessions_on_other_clicks ON public.track_sessions USING btree (other_clicks);


--
-- Name: index_track_sessions_on_other_hovers; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_track_sessions_on_other_hovers ON public.track_sessions USING btree (other_hovers);


--
-- Name: index_track_sessions_on_pricing_filter_clicks; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_track_sessions_on_pricing_filter_clicks ON public.track_sessions USING btree (pricing_filter_clicks);


--
-- Name: index_track_sessions_on_reset_filter_clicks; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_track_sessions_on_reset_filter_clicks ON public.track_sessions USING btree (reset_filter_clicks);


--
-- Name: index_track_sessions_on_schedule_tour_clicks; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_track_sessions_on_schedule_tour_clicks ON public.track_sessions USING btree (schedule_tour_clicks);


--
-- Name: index_track_sessions_on_sorting_filter_clicks; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_track_sessions_on_sorting_filter_clicks ON public.track_sessions USING btree (sorting_filter_clicks);


--
-- Name: index_track_sessions_on_square_feet_filter_clicks; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_track_sessions_on_square_feet_filter_clicks ON public.track_sessions USING btree (square_feet_filter_clicks);


--
-- Name: index_track_sessions_on_unit_marker_clicks; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_track_sessions_on_unit_marker_clicks ON public.track_sessions USING btree (unit_marker_clicks);


--
-- Name: index_track_sessions_on_unit_marker_hovers; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_track_sessions_on_unit_marker_hovers ON public.track_sessions USING btree (unit_marker_hovers);


--
-- Name: index_track_sessions_on_unit_modal_buttons_clicks; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_track_sessions_on_unit_modal_buttons_clicks ON public.track_sessions USING btree (unit_modal_buttons_clicks);


--
-- Name: index_track_sessions_on_view_saved_clicks; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_track_sessions_on_view_saved_clicks ON public.track_sessions USING btree (view_saved_clicks);


--
-- Name: index_track_sessions_on_virtual_tour_clicks; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_track_sessions_on_virtual_tour_clicks ON public.track_sessions USING btree (virtual_tour_clicks);


--
-- Name: index_track_sessions_on_zoom_in_clicks; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_track_sessions_on_zoom_in_clicks ON public.track_sessions USING btree (zoom_in_clicks);


--
-- Name: index_track_sessions_on_zoom_out_clicks; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_track_sessions_on_zoom_out_clicks ON public.track_sessions USING btree (zoom_out_clicks);


--
-- Name: index_track_sessions_on_zoom_refresh_clicks; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_track_sessions_on_zoom_refresh_clicks ON public.track_sessions USING btree (zoom_refresh_clicks);


--
-- Name: index_tutorials_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_tutorials_on_community_id ON public.tutorials USING btree (community_id);


--
-- Name: index_unit_elevators_on_elevator_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_unit_elevators_on_elevator_id ON public.unit_elevators USING btree (elevator_id);


--
-- Name: index_unit_elevators_on_unit_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_unit_elevators_on_unit_id ON public.unit_elevators USING btree (unit_id);


--
-- Name: index_unit_space_details_on_community_id_and_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_unit_space_details_on_community_id_and_provider ON public.unit_space_details USING btree (community_id, provider);


--
-- Name: index_unit_space_details_on_community_id_and_provider_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_unit_space_details_on_community_id_and_provider_space_id ON public.unit_space_details USING btree (community_id, provider_space_id);


--
-- Name: index_unit_space_details_on_community_id_and_space_letter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_unit_space_details_on_community_id_and_space_letter ON public.unit_space_details USING btree (community_id, space_letter);


--
-- Name: index_unit_space_details_on_unit_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_unit_space_details_on_unit_id ON public.unit_space_details USING btree (unit_id);


--
-- Name: index_units_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_units_on_community_id ON public.units USING btree (community_id);


--
-- Name: index_units_on_floorplan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_units_on_floorplan_id ON public.units USING btree (floorplan_id);


--
-- Name: index_units_on_floorplate_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_units_on_floorplate_id ON public.units USING btree (floorplate_id);


--
-- Name: index_user_stripes_on_tour_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_user_stripes_on_tour_user_id ON public.user_stripes USING btree (tour_user_id);


--
-- Name: index_users_on_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_users_on_email ON public.users USING btree (email);


--
-- Name: index_users_on_invitation_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_users_on_invitation_token ON public.users USING btree (invitation_token);


--
-- Name: index_users_on_invitations_count; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_users_on_invitations_count ON public.users USING btree (invitations_count);


--
-- Name: index_users_on_invited_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_users_on_invited_by_id ON public.users USING btree (invited_by_id);


--
-- Name: index_users_on_region_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_users_on_region_id ON public.users USING btree (region_id);


--
-- Name: index_users_on_reset_password_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_users_on_reset_password_token ON public.users USING btree (reset_password_token);


--
-- Name: index_versions_on_item_type_and_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_versions_on_item_type_and_item_id ON public.versions USING btree (item_type, item_id);


--
-- Name: index_visited_stops_on_tour_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_visited_stops_on_tour_user_id ON public.visited_stops USING btree (tour_user_id);


--
-- Name: index_wayfinding_stops_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_wayfinding_stops_on_community_id ON public.wayfinding_stops USING btree (community_id);


--
-- Name: index_wayfinding_stops_on_community_id_and_kind; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_wayfinding_stops_on_community_id_and_kind ON public.wayfinding_stops USING btree (community_id, kind);


--
-- Name: index_wayfinding_stops_on_map_type_and_map_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_wayfinding_stops_on_map_type_and_map_id ON public.wayfinding_stops USING btree (map_type, map_id);


--
-- Name: index_webpages_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_webpages_on_community_id ON public.webpages USING btree (community_id);


--
-- Name: index_yales_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_yales_on_community_id ON public.yales USING btree (community_id);


--
-- Name: index_zerv_guests_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_zerv_guests_on_community_id ON public.zerv_guests USING btree (community_id);


--
-- Name: index_zerv_guests_on_guest_of_stop_type_and_guest_of_stop_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_zerv_guests_on_guest_of_stop_type_and_guest_of_stop_id ON public.zerv_guests USING btree (guest_of_stop_type, guest_of_stop_id);


--
-- Name: index_zerv_guests_on_pynwheel_access_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_zerv_guests_on_pynwheel_access_user_id ON public.zerv_guests USING btree (pynwheel_access_user_id);


--
-- Name: index_zerv_guests_on_tour_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_zerv_guests_on_tour_user_id ON public.zerv_guests USING btree (tour_user_id);


--
-- Name: index_zerv_locks_on_stop_type_and_stop_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_zerv_locks_on_stop_type_and_stop_id ON public.zerv_locks USING btree (stop_type, stop_id);


--
-- Name: index_zerv_locks_on_zerv_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_zerv_locks_on_zerv_id ON public.zerv_locks USING btree (zerv_id);


--
-- Name: index_zervs_on_community_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_zervs_on_community_id ON public.zervs USING btree (community_id);


--
-- Name: read_marks_reader_readable_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX read_marks_reader_readable_index ON public.read_marks USING btree (reader_id, reader_type, readable_type, readable_id);


--
-- Name: resident_access_point_unique_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX resident_access_point_unique_index ON public.resident_access_points USING btree (pynwheel_access_user_id, access_point_id);


--
-- Name: font_settings fk_rails_016a4b2287; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.font_settings
    ADD CONSTRAINT fk_rails_016a4b2287 FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: webpages fk_rails_021dc8d280; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webpages
    ADD CONSTRAINT fk_rails_021dc8d280 FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: elevator_banks fk_rails_032ad88151; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elevator_banks
    ADD CONSTRAINT fk_rails_032ad88151 FOREIGN KEY (elevator_id) REFERENCES public.elevators(id);


--
-- Name: latches fk_rails_0477e9b920; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.latches
    ADD CONSTRAINT fk_rails_0477e9b920 FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: chats fk_rails_04a1688a0e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chats
    ADD CONSTRAINT fk_rails_04a1688a0e FOREIGN KEY (chatroom_id) REFERENCES public.chatrooms(id);


--
-- Name: igloohomes fk_rails_071356da44; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.igloohomes
    ADD CONSTRAINT fk_rails_071356da44 FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: tours fk_rails_07352c4a2e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tours
    ADD CONSTRAINT fk_rails_07352c4a2e FOREIGN KEY (tour_user_id) REFERENCES public.tour_users(id);


--
-- Name: opening_hours fk_rails_0b591099c3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opening_hours
    ADD CONSTRAINT fk_rails_0b591099c3 FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: unit_elevators fk_rails_0c769019cd; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_elevators
    ADD CONSTRAINT fk_rails_0c769019cd FOREIGN KEY (elevator_id) REFERENCES public.elevators(id);


--
-- Name: sub_communities fk_rails_0e487406d0; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_communities
    ADD CONSTRAINT fk_rails_0e487406d0 FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: imagepages fk_rails_0e9d404118; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imagepages
    ADD CONSTRAINT fk_rails_0e9d404118 FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: tour_settings fk_rails_114b3de83b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tour_settings
    ADD CONSTRAINT fk_rails_114b3de83b FOREIGN KEY (tour_id) REFERENCES public.tours(id);


--
-- Name: visited_stops fk_rails_11a664d209; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visited_stops
    ADD CONSTRAINT fk_rails_11a664d209 FOREIGN KEY (tour_user_id) REFERENCES public.tour_users(id);


--
-- Name: allowed_emails fk_rails_12123781a5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allowed_emails
    ADD CONSTRAINT fk_rails_12123781a5 FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: favorite_stops fk_rails_1e1bcb6707; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_stops
    ADD CONSTRAINT fk_rails_1e1bcb6707 FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: feedbacks fk_rails_20e05e4aa3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedbacks
    ADD CONSTRAINT fk_rails_20e05e4aa3 FOREIGN KEY (tour_user_id) REFERENCES public.tour_users(id);


--
-- Name: scheduler_widget_settings fk_rails_2111579718; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduler_widget_settings
    ADD CONSTRAINT fk_rails_2111579718 FOREIGN KEY (tour_id) REFERENCES public.tours(id);


--
-- Name: igloo_guests fk_rails_23cc632fa3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.igloo_guests
    ADD CONSTRAINT fk_rails_23cc632fa3 FOREIGN KEY (tour_user_id) REFERENCES public.tour_users(id);


--
-- Name: favorite_images fk_rails_26297c05da; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_images
    ADD CONSTRAINT fk_rails_26297c05da FOREIGN KEY (favorite_setting_id) REFERENCES public.favorite_settings(id);


--
-- Name: crm_discovery_sources fk_rails_270376abca; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_discovery_sources
    ADD CONSTRAINT fk_rails_270376abca FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: maps_positions fk_rails_2cfcb730a8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maps_positions
    ADD CONSTRAINT fk_rails_2cfcb730a8 FOREIGN KEY (floorplate_id) REFERENCES public.floorplates(id);


--
-- Name: unit_space_details fk_rails_2f1021a004; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_space_details
    ADD CONSTRAINT fk_rails_2f1021a004 FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;


--
-- Name: map_partners fk_rails_2fd0d7db9d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.map_partners
    ADD CONSTRAINT fk_rails_2fd0d7db9d FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: regions fk_rails_333a56f23c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT fk_rails_333a56f23c FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: hallway_edges fk_rails_3485fcbe55; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hallway_edges
    ADD CONSTRAINT fk_rails_3485fcbe55 FOREIGN KEY (to_hallway_id) REFERENCES public.hallways(id) ON DELETE CASCADE;


--
-- Name: community_users fk_rails_350d6254ae; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_users
    ADD CONSTRAINT fk_rails_350d6254ae FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: latch_auth_tokens fk_rails_38c6b6c5b4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.latch_auth_tokens
    ADD CONSTRAINT fk_rails_38c6b6c5b4 FOREIGN KEY (tour_user_id) REFERENCES public.tour_users(id);


--
-- Name: prospects fk_rails_39bdca78b9; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prospects
    ADD CONSTRAINT fk_rails_39bdca78b9 FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: zerv_guests fk_rails_408391043c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zerv_guests
    ADD CONSTRAINT fk_rails_408391043c FOREIGN KEY (tour_user_id) REFERENCES public.tour_users(id);


--
-- Name: gallery_images fk_rails_4184e9956a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gallery_images
    ADD CONSTRAINT fk_rails_4184e9956a FOREIGN KEY (gallery_id) REFERENCES public.galleries(id);


--
-- Name: amenity_galleries fk_rails_418b63d08e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amenity_galleries
    ADD CONSTRAINT fk_rails_418b63d08e FOREIGN KEY (amenity_id) REFERENCES public.amenities(id);


--
-- Name: building_starting_points fk_rails_43b374eb40; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.building_starting_points
    ADD CONSTRAINT fk_rails_43b374eb40 FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: locations fk_rails_47ebe1fbb9; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT fk_rails_47ebe1fbb9 FOREIGN KEY (neighborhood_id) REFERENCES public.neighborhoods(id);


--
-- Name: resident_access_points fk_rails_4ab3b7d2fa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resident_access_points
    ADD CONSTRAINT fk_rails_4ab3b7d2fa FOREIGN KEY (pynwheel_access_user_id) REFERENCES public.pynwheel_access_users(id);


--
-- Name: edge_states fk_rails_4b93dd2d5b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edge_states
    ADD CONSTRAINT fk_rails_4b93dd2d5b FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: hallway_edges fk_rails_4c2c147e6e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hallway_edges
    ADD CONSTRAINT fk_rails_4c2c147e6e FOREIGN KEY (from_hallway_id) REFERENCES public.hallways(id) ON DELETE CASCADE;


--
-- Name: elevators fk_rails_4e35cda357; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elevators
    ADD CONSTRAINT fk_rails_4e35cda357 FOREIGN KEY (floorplate_id) REFERENCES public.floorplates(id);


--
-- Name: igloohome_guests fk_rails_4efa6d200a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.igloohome_guests
    ADD CONSTRAINT fk_rails_4efa6d200a FOREIGN KEY (tour_user_id) REFERENCES public.tour_users(id);


--
-- Name: design_system_configs fk_rails_4f675ff884; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.design_system_configs
    ADD CONSTRAINT fk_rails_4f675ff884 FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: homepage_icons fk_rails_4f6a7da6d8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homepage_icons
    ADD CONSTRAINT fk_rails_4f6a7da6d8 FOREIGN KEY (design_id) REFERENCES public.designs(id);


--
-- Name: latch_guests fk_rails_4fde04b569; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.latch_guests
    ADD CONSTRAINT fk_rails_4fde04b569 FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: group_homepage_videos fk_rails_54349d1c64; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_homepage_videos
    ADD CONSTRAINT fk_rails_54349d1c64 FOREIGN KEY (group_design_id) REFERENCES public.group_designs(id);


--
-- Name: neighborhoods fk_rails_553ad80067; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.neighborhoods
    ADD CONSTRAINT fk_rails_553ad80067 FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: as_guests fk_rails_59ac0e2963; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.as_guests
    ADD CONSTRAINT fk_rails_59ac0e2963 FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: neighbour_units fk_rails_5c95a47cc5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.neighbour_units
    ADD CONSTRAINT fk_rails_5c95a47cc5 FOREIGN KEY (path_point_id) REFERENCES public.path_points(id);


--
-- Name: galleries fk_rails_60d35434d2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.galleries
    ADD CONSTRAINT fk_rails_60d35434d2 FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: tours fk_rails_61d278608c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tours
    ADD CONSTRAINT fk_rails_61d278608c FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: doors fk_rails_63689bb4fb; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doors
    ADD CONSTRAINT fk_rails_63689bb4fb FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: company_settings fk_rails_6434bf6768; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_settings
    ADD CONSTRAINT fk_rails_6434bf6768 FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: as_guests fk_rails_66e117de5f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.as_guests
    ADD CONSTRAINT fk_rails_66e117de5f FOREIGN KEY (tour_user_id) REFERENCES public.tour_users(id);


--
-- Name: calculator_configs fk_rails_6a3d5635d2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calculator_configs
    ADD CONSTRAINT fk_rails_6a3d5635d2 FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: elevators fk_rails_6cc5f0ce0c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elevators
    ADD CONSTRAINT fk_rails_6cc5f0ce0c FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: oauth_access_tokens fk_rails_732cb83ab7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_access_tokens
    ADD CONSTRAINT fk_rails_732cb83ab7 FOREIGN KEY (application_id) REFERENCES public.oauth_applications(id);


--
-- Name: schedual_tours fk_rails_733fd12712; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedual_tours
    ADD CONSTRAINT fk_rails_733fd12712 FOREIGN KEY (tour_id) REFERENCES public.tours(id);


--
-- Name: map_filters fk_rails_741a5463a2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.map_filters
    ADD CONSTRAINT fk_rails_741a5463a2 FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: elevators fk_rails_75bcc6b882; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elevators
    ADD CONSTRAINT fk_rails_75bcc6b882 FOREIGN KEY (sitemap_id) REFERENCES public.sitemaps(id);


--
-- Name: maps_positions fk_rails_76ac5cf1e2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maps_positions
    ADD CONSTRAINT fk_rails_76ac5cf1e2 FOREIGN KEY (sitemap_id) REFERENCES public.sitemaps(id);


--
-- Name: group_designs fk_rails_76bf4a61fe; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_designs
    ADD CONSTRAINT fk_rails_76bf4a61fe FOREIGN KEY (community_group_id) REFERENCES public.community_groups(id);


--
-- Name: crm_credentials fk_rails_7db70606e5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_credentials
    ADD CONSTRAINT fk_rails_7db70606e5 FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: bedroom_marker_colors fk_rails_7e573d7f3b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bedroom_marker_colors
    ADD CONSTRAINT fk_rails_7e573d7f3b FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: feedbacks fk_rails_7f0bbe81fd; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedbacks
    ADD CONSTRAINT fk_rails_7f0bbe81fd FOREIGN KEY (tour_id) REFERENCES public.tours(id);


--
-- Name: elevator_galleries fk_rails_810878e89e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elevator_galleries
    ADD CONSTRAINT fk_rails_810878e89e FOREIGN KEY (elevator_id) REFERENCES public.elevators(id);


--
-- Name: stop_details fk_rails_828bb9891c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stop_details
    ADD CONSTRAINT fk_rails_828bb9891c FOREIGN KEY (tour_stop_id) REFERENCES public.tour_stops(id);


--
-- Name: tour_stops fk_rails_867560a783; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tour_stops
    ADD CONSTRAINT fk_rails_867560a783 FOREIGN KEY (tour_id) REFERENCES public.tours(id);


--
-- Name: user_stripes fk_rails_87bd17a3db; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_stripes
    ADD CONSTRAINT fk_rails_87bd17a3db FOREIGN KEY (tour_user_id) REFERENCES public.tour_users(id);


--
-- Name: igloohome_locks fk_rails_8cd03b99a3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.igloohome_locks
    ADD CONSTRAINT fk_rails_8cd03b99a3 FOREIGN KEY (igloohome_id) REFERENCES public.igloohomes(id);


--
-- Name: maps_positions fk_rails_949fcf8dc5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maps_positions
    ADD CONSTRAINT fk_rails_949fcf8dc5 FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: chatrooms fk_rails_99a00f7df7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chatrooms
    ADD CONSTRAINT fk_rails_99a00f7df7 FOREIGN KEY (tour_id) REFERENCES public.tours(id);


--
-- Name: latch_locks fk_rails_a4bcfab579; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.latch_locks
    ADD CONSTRAINT fk_rails_a4bcfab579 FOREIGN KEY (latch_id) REFERENCES public.latches(id);


--
-- Name: three_d_maps_configurations fk_rails_a8b6aebab8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.three_d_maps_configurations
    ADD CONSTRAINT fk_rails_a8b6aebab8 FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: tour_histories fk_rails_a9909fd607; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tour_histories
    ADD CONSTRAINT fk_rails_a9909fd607 FOREIGN KEY (tour_user_id) REFERENCES public.tour_users(id);


--
-- Name: lock_histories fk_rails_ab5d4d0be8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lock_histories
    ADD CONSTRAINT fk_rails_ab5d4d0be8 FOREIGN KEY (tour_user_id) REFERENCES public.tour_users(id);


--
-- Name: zervs fk_rails_ac8973091e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zervs
    ADD CONSTRAINT fk_rails_ac8973091e FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: stop_galleries fk_rails_adc7e72845; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stop_galleries
    ADD CONSTRAINT fk_rails_adc7e72845 FOREIGN KEY (tour_stop_id) REFERENCES public.tour_stops(id);


--
-- Name: credentials fk_rails_b055047234; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credentials
    ADD CONSTRAINT fk_rails_b055047234 FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: sitemaps fk_rails_b1d1c56f20; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sitemaps
    ADD CONSTRAINT fk_rails_b1d1c56f20 FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: other_locks fk_rails_b1ffd809ab; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.other_locks
    ADD CONSTRAINT fk_rails_b1ffd809ab FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: zerv_guests fk_rails_b20f78d50a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zerv_guests
    ADD CONSTRAINT fk_rails_b20f78d50a FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: partner_events fk_rails_b46cdbcb45; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_events
    ADD CONSTRAINT fk_rails_b46cdbcb45 FOREIGN KEY (partner_id) REFERENCES public.partners(id);


--
-- Name: oauth_access_grants fk_rails_b4b53e07b8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_access_grants
    ADD CONSTRAINT fk_rails_b4b53e07b8 FOREIGN KEY (application_id) REFERENCES public.oauth_applications(id);


--
-- Name: community_users fk_rails_b4d02cd2e9; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_users
    ADD CONSTRAINT fk_rails_b4d02cd2e9 FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: lock_histories fk_rails_b909090b81; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lock_histories
    ADD CONSTRAINT fk_rails_b909090b81 FOREIGN KEY (tour_history_id) REFERENCES public.tour_histories(id);


--
-- Name: schedual_tours fk_rails_bccb52939c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedual_tours
    ADD CONSTRAINT fk_rails_bccb52939c FOREIGN KEY (tour_user_id) REFERENCES public.tour_users(id);


--
-- Name: favorite_settings fk_rails_befcc8a38d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_settings
    ADD CONSTRAINT fk_rails_befcc8a38d FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: community_groups fk_rails_c1c3e21b84; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_groups
    ADD CONSTRAINT fk_rails_c1c3e21b84 FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: guided_opening_hours fk_rails_c59a68cd22; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guided_opening_hours
    ADD CONSTRAINT fk_rails_c59a68cd22 FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: partner_events fk_rails_cc24c5297a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_events
    ADD CONSTRAINT fk_rails_cc24c5297a FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: prospects fk_rails_cdd535b960; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prospects
    ADD CONSTRAINT fk_rails_cdd535b960 FOREIGN KEY (tour_user_id) REFERENCES public.tour_users(id);


--
-- Name: latch_allowed_accesses fk_rails_d0c4ec0bcd; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.latch_allowed_accesses
    ADD CONSTRAINT fk_rails_d0c4ec0bcd FOREIGN KEY (latch_guest_id) REFERENCES public.latch_guests(id);


--
-- Name: dwelos fk_rails_d258c89e68; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dwelos
    ADD CONSTRAINT fk_rails_d258c89e68 FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: unit_elevators fk_rails_d5a4eb7b2f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_elevators
    ADD CONSTRAINT fk_rails_d5a4eb7b2f FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: tutorials fk_rails_d6bfa47a58; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutorials
    ADD CONSTRAINT fk_rails_d6bfa47a58 FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: remote_locks fk_rails_d86a87034b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.remote_locks
    ADD CONSTRAINT fk_rails_d86a87034b FOREIGN KEY (dwelo_id) REFERENCES public.dwelos(id);


--
-- Name: additional_images fk_rails_d917f4cb66; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.additional_images
    ADD CONSTRAINT fk_rails_d917f4cb66 FOREIGN KEY (imagepage_id) REFERENCES public.imagepages(id);


--
-- Name: additional_files fk_rails_d98fba9fe6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.additional_files
    ADD CONSTRAINT fk_rails_d98fba9fe6 FOREIGN KEY (imagepage_id) REFERENCES public.imagepages(id);


--
-- Name: remote_locks fk_rails_dadad82af8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.remote_locks
    ADD CONSTRAINT fk_rails_dadad82af8 FOREIGN KEY (edge_state_id) REFERENCES public.edge_states(id);


--
-- Name: crm_time_slots fk_rails_db0b5e4a6b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_time_slots
    ADD CONSTRAINT fk_rails_db0b5e4a6b FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: gallery_images fk_rails_ded15f1181; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gallery_images
    ADD CONSTRAINT fk_rails_ded15f1181 FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: zerv_locks fk_rails_e1e0be3fff; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zerv_locks
    ADD CONSTRAINT fk_rails_e1e0be3fff FOREIGN KEY (zerv_id) REFERENCES public.zervs(id);


--
-- Name: hallway_attachments fk_rails_e3eff795d2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hallway_attachments
    ADD CONSTRAINT fk_rails_e3eff795d2 FOREIGN KEY (hallway_id) REFERENCES public.hallways(id) ON DELETE CASCADE;


--
-- Name: igloohome_guests fk_rails_e50a300646; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.igloohome_guests
    ADD CONSTRAINT fk_rails_e50a300646 FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: chatrooms fk_rails_f132b4d3ac; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chatrooms
    ADD CONSTRAINT fk_rails_f132b4d3ac FOREIGN KEY (tour_user_id) REFERENCES public.tour_users(id);


--
-- Name: igloo_guests fk_rails_f23595079e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.igloo_guests
    ADD CONSTRAINT fk_rails_f23595079e FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: wayfinding_stops fk_rails_f5b218a7de; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wayfinding_stops
    ADD CONSTRAINT fk_rails_f5b218a7de FOREIGN KEY (hallway_id) REFERENCES public.hallways(id) ON DELETE SET NULL;


--
-- Name: latch_guests fk_rails_f6e610b688; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.latch_guests
    ADD CONSTRAINT fk_rails_f6e610b688 FOREIGN KEY (tour_user_id) REFERENCES public.tour_users(id);


--
-- Name: svg_optimization_runs fk_rails_f87b5da68b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.svg_optimization_runs
    ADD CONSTRAINT fk_rails_f87b5da68b FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: communities fk_rails_f9baf6ba48; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communities
    ADD CONSTRAINT fk_rails_f9baf6ba48 FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: credentials fk_rails_fc86905bb7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credentials
    ADD CONSTRAINT fk_rails_fc86905bb7 FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: group_homepage_images fk_rails_ff753225d2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_homepage_images
    ADD CONSTRAINT fk_rails_ff753225d2 FOREIGN KEY (group_design_id) REFERENCES public.group_designs(id);


--
-- Name: pynwheel_access_users fk_rails_fff15a1b56; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pynwheel_access_users
    ADD CONSTRAINT fk_rails_fff15a1b56 FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- PostgreSQL database dump complete
--

\unrestrict n4RbdbV7Trr5cbgrFk99dmXwy65Pxc4KHsCBR5MCHTB4bU89PiPPvfLkidUk0hb


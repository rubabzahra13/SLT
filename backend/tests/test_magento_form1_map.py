"""Form 1 field ids map onto order columns, including address line 2 and timestamps."""

import json
from datetime import datetime, timezone

from app.services.magento_orders import (
    clean_magento_value,
    order_values_from_result,
    parse_magento_timestamp,
    submission_is_after_cutoff,
)


def _field(field_id: str, value: str) -> dict:
    return {"field_id": field_id, "code": "ignored", "value": value}


def test_form1_maps_field_ids_and_keeps_select_labels():
    result = {
        "result_id": "1760",
        "form_id": 1,
        "created_at": "2026-11-02 13:11:00",
        "fields": [
            _field("1", "North Gym"),
            _field("2", "100 Main"),
            _field("3", "Suite 4"),
            _field("4", "Austin"),
            _field("5", "TX"),
            _field("6", "78701"),
            _field("7", "US"),
            _field("8", "Orange"),
            _field("9", "Senior 2"),
            _field("10", "All-Girl"),
            _field("11", "Red"),
            _field("12", "1"),
            _field("13", "Coach Kim"),
            _field("14", "555"),
            _field("15", "kim@example.com"),
            _field("16", "Pat Lee"),
            _field("17", "pat@example.com"),
            _field("272", "First Available"),
            _field("19", "Gold Package"),
            _field("20", "1:30"),
            _field("21", "Power Music & Unleash the Beats Covers (can not be used for a Titanium Package)"),
            _field("22", "Yes"),
            _field("23", "song a"),
            _field("24", "notes"),
            _field("25", ""),
            _field("26", "Return Customer"),
        ],
    }
    values = order_values_from_result(result, 1)
    assert values["magento_result_id"] == "1760"
    assert values["magento_form_id"] == "1"
    assert values["form_type"] == "school-all-star-cheer"
    assert values["cheer_form_subtype"] == "all-star-cheer"
    assert values["school_gym_name"] == "North Gym"
    assert values["school_gym_billing_address"] == "100 Main"
    assert values["school_gym_billing_address_line_2"] == "Suite 4"
    assert values["country"] == "US"
    assert values["team_coed_all_girl"] == "All-Girl"
    assert values["package_type"] == "Gold Package"
    assert values["package"] == "Gold Package"
    assert values["music_affiliate"].startswith("Power Music")
    assert values["sending_eight_count_sheets"] == "Yes"
    assert values["requested_editor"] == "First Available"
    assert values["coupon_code"] is None
    stamp = values["created_at"]
    assert stamp.tzinfo is timezone.utc
    assert stamp.year == 2026 and stamp.hour == 13 and stamp.minute == 11


def test_form14_viroc_splits_affiliate_fields_by_id():
    result = {
        "result_id": "9001",
        "form_id": 14,
        "created_at": "2026-11-03 04:00:00",
        "fields": [
            _field("285", "Central High"),
            _field("286", "10 School Rd"),
            _field("287", "Room 2"),
            _field("288", "Dallas"),
            _field("289", "TX"),
            _field("290", "75001"),
            _field("291", "US"),
            _field("292", "Tigers"),
            _field("293", "Large"),
            _field("294", "Coed"),
            _field("295", "Black"),
            _field("296", "2"),
            _field("297", "Coach Kim"),
            _field("298", "555"),
            _field("299", "kim@example.com"),
            _field("300", "Pat Lee"),
            _field("301", "pat@example.com"),
            _field("302", "Viroc Chris"),
            _field("303", "chris@example.com"),
            _field("305", "First Available"),
            _field("306", "Gold Package"),
            _field("307", "1:45"),
            _field("308", "Split"),
            _field("309", "Power Music & Unleash the Beats Covers (can not be used for a Titanium Package)"),
            _field("310", "Yes"),
            _field("311", "song a"),
            _field("312", "notes"),
            _field("313", ""),
            _field("314", "Return Customer"),
        ],
    }
    values = order_values_from_result(result, 14)
    assert values["cheer_form_subtype"] == "school-cheer-viroc-yes"
    assert values["varsity_viroc_customer"] == "Yes"
    assert values["form_type"] == "school-all-star-cheer"
    assert values["school_gym_name"] == "Central High"
    assert values["school_gym_billing_address"] == "10 School Rd"
    assert values["school_gym_billing_address_line_2"] == "Room 2"
    assert values["mascot"] == "Tigers"
    assert values["choreographer_name"] == "Viroc Chris"
    assert values["split_or_no_split"] == "Split"
    assert values["music_affiliate"].startswith("Power Music")
    assert values["coupon_code"] is None
    assert values["created_at"].tzinfo is timezone.utc


def _form2_result(result_id: str, page_url: str) -> dict:
    return {
        "result_id": result_id,
        "form_id": 2,
        "created_at": "2026-11-03 04:24:38",
        "submitted_from_serialized": json.dumps({"url": page_url, "title": "order"}),
        "fields": [
            _field("27", "Central High"),
            _field("28", "10 School Rd"),
            _field("29", "Room 2"),
            _field("30", "Dallas"),
            _field("31", "TX"),
            _field("32", "75001"),
            _field("33", "US"),
            _field("34", "Tigers"),
            _field("35", "Large"),
            _field("36", "All-Girl"),
            _field("37", "Black"),
            _field("38", "2"),
            _field("39", "Coach Kim"),
            _field("40", "555"),
            _field("41", "kim@example.com"),
            _field("42", "Pat Lee"),
            _field("43", "pat@example.com"),
            _field("44", "Chris"),
            _field("45", "chris@example.com"),
            _field("273", "First Available"),
            _field("47", "Gold Package"),
            _field("48", "1:45"),
            _field("49", "Split"),
            _field("50", "Power Music & Unleash the Beats Covers (can not be used for a Titanium Package)"),
            _field("51", "Yes"),
            _field("52", "song a"),
            _field("53", "notes"),
            _field("54", ""),
            _field("55", "Return Customer"),
        ],
    }


def test_form2_school_cheer_page_is_viroc_no():
    values = order_values_from_result(
        _form2_result(
            "1760",
            "https://staging.powermusiccheer.com/slt/cheerchoices/schoolcheerrates/schoolcheerorder",
        ),
        2,
    )
    assert values is not None
    assert values["cheer_form_subtype"] == "school-cheer-viroc-no"
    assert values["varsity_viroc_customer"] == "No"
    assert values["form_type"] == "school-all-star-cheer"
    assert values["magento_form_id"] == "2"
    assert values["school_gym_billing_address_line_2"] == "Room 2"
    assert values["mascot"] == "Tigers"
    assert values["choreographer_name"] == "Chris"
    assert values["split_or_no_split"] == "Split"
    assert values["music_affiliate"].startswith("Power Music")
    assert values["package"] == "Gold Package"
    assert values["coupon_code"] is None


def test_form2_viroc_page_is_viroc_yes():
    page = "https://staging.powermusiccheer.com/slt/cheerchoices/vroccheerrates/vroccheerorder"
    result = _form2_result("1762", page)
    result["submitted_from_serialized"] = {"url": page, "title": "V!ROC Cheer Order"}
    values = order_values_from_result(result, 2)
    assert values is not None
    assert values["cheer_form_subtype"] == "school-cheer-viroc-yes"
    assert values["varsity_viroc_customer"] == "Yes"


def test_form2_uses_referrer_when_submitted_from_is_empty():
    result = _form2_result("1763", "https://example.test/unused")
    result["submitted_from_serialized"] = ""
    result["referrer_page"] = {
        "url": "https://staging.powermusiccheer.com/slt/cheerchoices/schoolcheerrates/schoolcheerorder",
        "title": "School Cheer Order",
    }
    values = order_values_from_result(result, 2)
    assert values is not None
    assert values["varsity_viroc_customer"] == "No"


def test_form2_unknown_page_is_not_imported():
    values = order_values_from_result(
        _form2_result("1764", "https://staging.powermusiccheer.com/some-other-page"),
        2,
    )
    assert values is None


def test_form3_youth_rec_maps_contact_phone_and_address_line_2():
    result = {
        "result_id": "1800",
        "form_id": 3,
        "created_at": "2026-11-03 05:10:00",
        "fields": [
            _field("56", "Rec Program"),
            _field("57", "Tiny Team"),
            _field("58", "Blue"),
            _field("59", "1 Rec Rd"),
            _field("60", "Gym B"),
            _field("61", "Austin"),
            _field("62", "TX"),
            _field("63", "78701"),
            _field("64", "US"),
            _field("65", "Coach Kim"),
            _field("66", "kim@example.com"),
            _field("67", "555-0100"),
            _field("68", "bill@example.com"),
            _field("69", "555-0199"),
            _field("70", "Gold Package"),
            _field("71", "1:30"),
            _field("72", "No Split"),
            _field("73", "2"),
            _field("74", "Yes"),
            _field("75", "song a"),
            _field("76", "notes"),
            _field("77", ""),
            _field("78", "Return Customer"),
        ],
    }
    values = order_values_from_result(result, 3)
    assert values is not None
    assert values["form_type"] == "school-all-star-cheer"
    assert values["cheer_form_subtype"] == "youth-rec-cheer"
    assert values["school_gym_name"] == "Rec Program"
    assert values["team_name"] == "Tiny Team"
    assert values["school_gym_billing_address"] == "1 Rec Rd"
    assert values["school_gym_billing_address_line_2"] == "Gym B"
    assert values["coach_phone"] == "555-0100"
    assert values["billing_person_email"] == "bill@example.com"
    assert values["contact_phone_for_youth_rec_cheer"] == "555-0199"
    assert values["split_or_no_split"] == "No Split"
    assert values["package"] == "Gold Package"
    assert values["coupon_code"] is None
    assert "varsity_viroc_customer" not in values


def test_form4_pom_packs_covers_and_keeps_address_line_2():
    result = {
        "result_id": "1900",
        "form_id": 4,
        "created_at": "2026-11-03 05:20:00",
        "fields": [
            _field("79", "Pom Studio"),
            _field("80", "10 Dance Rd"),
            _field("81", "Studio B"),
            _field("82", "Austin"),
            _field("83", "TX"),
            _field("84", "78701"),
            _field("85", "US"),
            _field("86", "Junior"),
            _field("87", "Coach Kim"),
            _field("88", "555-0100"),
            _field("89", "kim@example.com"),
            _field("90", "Pat Lee"),
            _field("91", "pat@example.com"),
            _field("92", "Chris"),
            _field("93", "chris@example.com"),
            _field("94", "2"),
            _field("95", "Gold Package"),
            _field("275", "First Available"),
            _field("96", "2:00"),
            _field("97", "Power Music Covers\nUnleash the Beats Covers"),
            _field("98", "song a"),
            _field("99", "song b"),
            _field("100", "notes"),
            _field("101", "Yes - Traditional $25"),
            _field("102", "Go team"),
            _field("280", "Pom as PAHM"),
            _field("103", ""),
        ],
    }
    values = order_values_from_result(result, 4)
    assert values is not None
    assert values["form_type"] == "school-all-star-dance"
    assert values["dance_form_subtype"] == "pom"
    assert "cheer_form_subtype" not in values
    assert values["school_gym_billing_address"] == "10 Dance Rd"
    assert values["school_gym_billing_address_line_2"] == "Studio B"
    assert values["music_affiliate"] == "Power Music Covers\nUnleash the Beats Covers"
    assert values["music_affiliate_selections"] == values["music_affiliate"]
    assert values["song_list_suggestions"] == (
        "Power Music Covers:\nsong a\n\nUnleash the Beats Covers:\nsong b"
    )
    assert values["custom_voiceovers"] == "Yes - Traditional $25"
    assert values["voiceover_script"] == "Go team"
    assert values["pronunciation_guidance"] == "Pom as PAHM"
    assert values["package"] == "Gold Package"
    assert values["coupon_code"] is None


def test_form5_hip_hop_matches_pom_columns():
    result = {
        "result_id": "1901",
        "form_id": 5,
        "created_at": "2026-11-03 05:30:00",
        "fields": [
            _field("104", "Hip Hop Crew"),
            _field("105", "20 Dance Rd"),
            _field("106", "Room 3"),
            _field("107", "Dallas"),
            _field("108", "TX"),
            _field("109", "75001"),
            _field("110", "US"),
            _field("111", "Senior"),
            _field("112", "Coach Kim"),
            _field("113", "555-0111"),
            _field("114", "kim@example.com"),
            _field("115", "Pat Lee"),
            _field("116", "pat@example.com"),
            _field("117", "Chris"),
            _field("118", "chris@example.com"),
            _field("274", "3"),
            _field("119", "Silver Package"),
            _field("276", "First Available"),
            _field("120", "1:45"),
            _field("121", "Power Music Covers"),
            _field("122", "song a"),
            _field("123", ""),
            _field("124", "notes"),
            _field("125", "No - None"),
            _field("126", ""),
            _field("281", "crew as CROO"),
            _field("127", "SAVE10"),
        ],
    }
    values = order_values_from_result(result, 5)
    assert values is not None
    assert values["form_type"] == "school-all-star-dance"
    assert values["dance_form_subtype"] == "hip-hop"
    assert "cheer_form_subtype" not in values
    assert values["school_gym_billing_address_line_2"] == "Room 3"
    assert values["number_of_copies"] == "3"
    assert values["requested_editor"] == "First Available"
    assert values["music_affiliate_selections"] == "Power Music Covers"
    assert values["song_list_suggestions"] == (
        "Power Music Covers:\nsong a\n\nUnleash the Beats Covers:\n"
    )
    assert values["pronunciation_guidance"] == "crew as CROO"
    assert values["coupon_code"] == "SAVE10"
    assert values["package"] == "Silver Package"


def test_form6_team_performance_variety_includes_style():
    result = {
        "result_id": "1902",
        "form_id": 6,
        "created_at": "2026-11-03 05:40:00",
        "fields": [
            _field("128", "Variety Crew"),
            _field("129", "30 Dance Rd"),
            _field("130", "Studio B"),
            _field("131", "Austin"),
            _field("132", "TX"),
            _field("133", "78701"),
            _field("134", "US"),
            _field("135", "Coach Ann"),
            _field("136", "555-0122"),
            _field("137", "ann@example.com"),
            _field("138", "Bill Ray"),
            _field("139", "bill@example.com"),
            _field("140", "N/A"),
            _field("141", "N/A"),
            _field("142", "2"),
            _field("143", "Junior"),
            _field("144", "Jazz"),
            _field("277", "First Available"),
            _field("145", "Gold Package"),
            _field("146", "2:00"),
            _field("147", "Power Music Covers\nUnleash the Beats Covers"),
            _field("148", "power song"),
            _field("149", "unleash song"),
            _field("150", "open with jazz"),
            _field("151", "No - None"),
            _field("152", ""),
            _field("282", "variety as vuh-RYE-uh-tee"),
            _field("153", "TEAM6"),
        ],
    }
    values = order_values_from_result(result, 6)
    assert values is not None
    assert values["form_type"] == "school-all-star-dance"
    assert values["dance_form_subtype"] == "team-performance-variety"
    assert "cheer_form_subtype" not in values
    assert values["school_gym_billing_address_line_2"] == "Studio B"
    assert values["division"] == "Junior"
    assert values["style"] == "Jazz"
    assert values["number_of_copies"] == "2"
    assert values["requested_editor"] == "First Available"
    assert values["music_affiliate_selections"] == (
        "Power Music Covers\nUnleash the Beats Covers"
    )
    assert values["song_list_suggestions"] == (
        "Power Music Covers:\npower song\n\nUnleash the Beats Covers:\nunleash song"
    )
    assert values["pronunciation_guidance"] == "variety as vuh-RYE-uh-tee"
    assert values["coupon_code"] == "TEAM6"
    assert values["package"] == "Gold Package"


def test_form7_gameday_style_without_division():
    result = {
        "result_id": "1903",
        "form_id": 7,
        "created_at": "2026-11-03 05:50:00",
        "fields": [
            _field("154", "Gameday Crew"),
            _field("155", "40 Dance Rd"),
            _field("156", "Gym C"),
            _field("157", "Houston"),
            _field("158", "TX"),
            _field("159", "77001"),
            _field("160", "US"),
            _field("161", "Coach Dee"),
            _field("162", "555-0133"),
            _field("163", "dee@example.com"),
            _field("164", "Sam Cole"),
            _field("165", "sam@example.com"),
            _field("166", "N/A"),
            _field("167", "N/A"),
            _field("172", "4 copies"),
            _field("168", "Bronze Package"),
            _field("169", "Sideline"),
            _field("170", "1:30"),
            _field("279", "First Available"),
            _field("171", "Unleash the Beats Covers"),
            _field("173", ""),
            _field("174", "beat song"),
            _field("175", "fight song first"),
            _field("176", "Yes - Traditional $25"),
            _field("177", "Go team"),
            _field("283", "gameday as GAME-day"),
            _field("178", "DAY7"),
        ],
    }
    values = order_values_from_result(result, 7)
    assert values is not None
    assert values["form_type"] == "school-all-star-dance"
    assert values["dance_form_subtype"] == "gameday"
    assert "cheer_form_subtype" not in values
    assert "division" not in values
    assert values["school_gym_billing_address_line_2"] == "Gym C"
    assert values["number_of_copies"] == "4 copies"
    assert values["style"] == "Sideline"
    assert values["requested_editor"] == "First Available"
    assert values["music_affiliate_selections"] == "Unleash the Beats Covers"
    assert values["song_list_suggestions"] == (
        "Power Music Covers:\n\n\nUnleash the Beats Covers:\nbeat song"
    )
    assert values["custom_voiceovers"] == "Yes - Traditional $25"
    assert values["voiceover_script"] == "Go team"
    assert values["pronunciation_guidance"] == "gameday as GAME-day"
    assert values["coupon_code"] == "DAY7"
    assert values["package"] == "Bronze Package"


def test_form8_jazz_kick_includes_licensing():
    result = {
        "result_id": "1904",
        "form_id": 8,
        "created_at": "2026-11-03 06:00:00",
        "fields": [
            _field("179", "Jazz Crew"),
            _field("180", "50 Dance Rd"),
            _field("181", "Studio D"),
            _field("182", "Denver"),
            _field("183", "CO"),
            _field("184", "80201"),
            _field("185", "US"),
            _field("186", "Coach Jo"),
            _field("187", "555-0144"),
            _field("188", "jo@example.com"),
            _field("189", "Alex Kim"),
            _field("190", "alex@example.com"),
            _field("191", "N/A"),
            _field("192", "N/A"),
            _field("193", "1"),
            _field("194", "Senior"),
            _field("195", "Kick"),
            _field("278", "First Available"),
            _field("196", "Gold Package"),
            _field("197", "2:15"),
            _field("198", "Yes"),
            _field("199", "Power Music Covers"),
            _field("200", "kick song"),
            _field("201", ""),
            _field("202", "kick section last"),
            _field("203", "No - None"),
            _field("204", ""),
            _field("284", "kick as KIK"),
            _field("205", "JAZZ8"),
        ],
    }
    values = order_values_from_result(result, 8)
    assert values is not None
    assert values["form_type"] == "school-all-star-dance"
    assert values["dance_form_subtype"] == "jazz-kick"
    assert "cheer_form_subtype" not in values
    assert values["school_gym_billing_address_line_2"] == "Studio D"
    assert values["division"] == "Senior"
    assert values["style"] == "Kick"
    assert values["licensing_required"] == "Yes"
    assert values["number_of_copies"] == "1"
    assert values["requested_editor"] == "First Available"
    assert values["music_affiliate_selections"] == "Power Music Covers"
    assert values["song_list_suggestions"] == (
        "Power Music Covers:\nkick song\n\nUnleash the Beats Covers:\n"
    )
    assert values["pronunciation_guidance"] == "kick as KIK"
    assert values["coupon_code"] == "JAZZ8"
    assert values["package"] == "Gold Package"


def test_form9_marching_band_has_no_subtype():
    result = {
        "result_id": "1905",
        "form_id": 9,
        "created_at": "2026-11-03 06:10:00",
        "fields": [
            _field("206", "North Band"),
            _field("207", "60 Field St"),
            _field("208", "Band Hall"),
            _field("209", "Chicago"),
            _field("210", "IL"),
            _field("211", "60601"),
            _field("212", "US"),
            _field("213", "Coach Ray"),
            _field("214", "555-0155"),
            _field("215", "ray@example.com"),
            _field("216", "Pat Ng"),
            _field("217", "patng@example.com"),
            _field("218", "Standard"),
            _field("219", "3:00"),
            _field("220", "brass and percussion"),
            _field("221", "fight song lyrics"),
        ],
    }
    values = order_values_from_result(result, 9)
    assert values is not None
    assert values["form_type"] == "marching-band"
    assert "cheer_form_subtype" not in values
    assert "dance_form_subtype" not in values
    assert values["school_gym_billing_address_line_2"] == "Band Hall"
    assert values["song_list_suggestions"] == "brass and percussion"
    assert values["routine_notes"] == "fight song lyrics"
    assert values["package"] == "Standard"
    assert values["time_length_of_mix"] == "3:00"
    assert values["coach_name"] == "Coach Ray"


def test_form10_sports_entertainment_appends_address_line_2():
    result = {
        "result_id": "1906",
        "form_id": 10,
        "created_at": "2026-11-03 06:20:00",
        "fields": [
            _field("223", "Metro FC"),
            _field("224", "601 F ST NW"),
            _field("225", "4th Floor"),
            _field("226", "Washington"),
            _field("227", "DC"),
            _field("228", "20004"),
            _field("229", "US"),
            _field("230", "Mina Cole"),
            _field("231", "555-0166"),
            _field("232", "mina@example.com"),
            _field("233", ""),
            _field("234", ""),
            _field("235", "Pro Package"),
            _field("236", "2026-04-15"),
            _field("237", "No"),
            _field("238", "2:30"),
            _field("239", "Celebrity Skin- Hole"),
            _field("240", "Big beginning"),
        ],
    }
    values = order_values_from_result(result, 10)
    assert values is not None
    assert values["form_type"] == "sports-entertainment"
    assert "cheer_form_subtype" not in values
    assert "dance_form_subtype" not in values
    assert values["school_gym_name"] == "Metro FC"
    assert values["school_gym_billing_address"] == "601 F ST NW\n4th Floor"
    assert "school_gym_billing_address_line_2" not in values
    assert values["coach_name"] == "Mina Cole"
    assert values["billing_person_name"] is None
    assert values["client_requested_mix_due_date"] == "2026-04-15"
    assert values["client_requested_rush_order"] == "No"
    assert values["song_list_suggestions"] == "Celebrity Skin- Hole"
    assert values["routine_notes"] == "Big beginning"
    assert values["package"] == "Pro Package"


def test_form11_school_anthem_style_is_song_list_not_style_column():
    result = {
        "result_id": "1907",
        "form_id": 11,
        "created_at": "2026-11-03 06:30:00",
        "fields": [
            _field("241", "Cavalier High"),
            _field("242", "10 Alma Dr"),
            _field("243", "Suite 2"),
            _field("244", "Richmond"),
            _field("245", "VA"),
            _field("246", "23219"),
            _field("247", "US"),
            _field("248", "Music Pat"),
            _field("249", "555-0177"),
            _field("250", "pat@example.com"),
            _field("251", "Bill Anthem"),
            _field("252", "bill@example.com"),
            _field("253", "Cavaliers"),
            _field("254", "Orange and Blue"),
            _field("255", "Cavs"),
            _field("256", "With Vocals"),
            _field("257", "Orchestral Brass"),
            _field("258", "Hail to the Cavaliers"),
            _field("259", "ANTHEM11"),
        ],
    }
    values = order_values_from_result(result, 11)
    assert values is not None
    assert values["form_type"] == "school-anthem"
    assert "cheer_form_subtype" not in values
    assert "dance_form_subtype" not in values
    assert "style" not in values
    assert values["school_gym_billing_address"] == "10 Alma Dr\nSuite 2"
    assert "school_gym_billing_address_line_2" not in values
    assert values["mascot"] == "Cavaliers"
    assert values["colors"] == "Orange and Blue"
    assert values["nicknames"] == "Cavs"
    assert values["vocals_preference"] == "With Vocals"
    assert values["song_list_suggestions"] == "Orchestral Brass"
    assert values["routine_notes"] == "Hail to the Cavaliers"
    assert values["coupon_code"] == "ANTHEM11"
    assert values["package_type"] == "SCHOOL ANTHEMS"
    assert values["package"] == "SCHOOL ANTHEMS"


def test_cutoff_keeps_existing_submissions_and_accepts_newer_ones():
    cutoff = datetime(2026, 11, 3, 5, 0, tzinfo=timezone.utc)
    older = {"created_at": "2026-11-03 04:59:59"}
    same = {"created_at": "2026-11-03 05:00:00"}
    newer = {"created_at": "2026-11-03 05:00:01"}
    assert submission_is_after_cutoff(older, cutoff) is False
    assert submission_is_after_cutoff(same, cutoff) is False
    assert submission_is_after_cutoff(newer, cutoff) is True


def test_missing_editor_error_is_empty():
    assert clean_magento_value('Error: Unable to find value with Result ID "12" and Field ID "272"') is None
    assert parse_magento_timestamp("2023-09-17 10:10:51").tzinfo is timezone.utc

import os
import sys
import uuid
from datetime import datetime, timezone

# Add backend root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.order import Order

def seed_all_orders():
    db = SessionLocal()
    try:
        print("Starting order seeding process...")
        
        # Check current count
        existing_count = db.query(Order).count()
        print(f"Current orders count in DB: {existing_count}")

        seeded_orders = []

        # 1. All-Star Cheer (10 records)
        all_star_gyms = [
            ("Apex Athletics", "Apex Velocity", "Standard All-Girl", "Red & Black", "Senior Open 6", "GOLD 1:30", "1:30"),
            ("Cheer Dynamics", "Dynamic Force", "Coed", "Blue & Gold", "Large Coed 5", "GOLD 2:00", "2:00"),
            ("Titanium Cheer", "Titanium Sparks", "Standard All-Girl", "Purple & Silver", "Junior 4", "GOLD 2:30", "2:30"),
            ("Velocity All Stars", "Velocity Vipers", "Coed", "Green & Black", "Senior Coed 5", "PLATINUM 1:30", "1:30"),
            ("Empire Athletics", "Empire Royalty", "Standard All-Girl", "Navy & White", "International Open 7", "PLATINUM 2:00", "2:00"),
            ("Pinnacle Cheer", "Pinnacle Elite", "Standard All-Girl", "Teal & Black", "Youth 3", "PLATINUM 2:30", "2:30"),
            ("Starlight All-Stars", "Starlight Comets", "Coed", "Silver & Magenta", "Small Senior Coed 6", "TITANIUM 1:30", "1:30"),
            ("Summit Cheer Academy", "Summit Avalanche", "Standard All-Girl", "White & Gold", "Senior 5", "TITANIUM 2:00", "2:00"),
            ("Thunder All-Stars", "Thunderbolts", "Coed", "Black & Yellow", "Open Coed 6", "TITANIUM 2:30", "2:30"),
            ("Eclipse Athletics", "Eclipse Shadow", "Standard All-Girl", "Maroon & Silver", "Junior 3", "GOLD 2:00", "2:00"),
        ]

        for i, (gym, team, coed, colors, div, pkg, time_len) in enumerate(all_star_gyms, 1):
            o = Order(
                form_type="school-all-star-cheer",
                cheer_form_subtype="all-star-cheer",
                category="Cheer",
                gym_name=gym,
                gym_billing_address=f"{100 + i} Athletic Way",
                city="Dallas",
                state_province="TX",
                zip_postal_code="75001",
                country="United States",
                team_name=team,
                team_coed_all_girl=coed,
                team_colors=colors,
                division=div,
                number_of_copies="2",
                coach_name=f"Coach Sarah {i}",
                coach_phone="555-010" + str(i),
                coach_email=f"sarah.cheer{i}@example.com",
                billing_person_name=f"Billing Manager {i}",
                billing_person_email=f"billing.allstar{i}@example.com",
                package_type=pkg,
                time_length_of_mix=time_len,
                music_affiliate="Power Music",
                sending_eight_count_sheets="Yes",
                song_list_suggestions=f"Hit song {i}, High energy dance drop, Energetic intro",
                routine_notes=f"Need strong stunts section at 0:45. Pyramid at 1:15.",
                coupon_code=f"CHEER10_{i}" if i % 3 == 0 else None,
                how_did_you_find_out="Word of Mouth",
                # Intake normalized fields
                customer_name=f"Sarah {i} ({gym})",
                contact_name=f"Coach Sarah {i}",
                program_name=gym,
                package=pkg,
                editor_request="FA",
                requested_editor="FA",
                requested_producer="FA",
                status="new",
                price=550.0 + (i * 10),
                price_compliance="compliant"
            )
            seeded_orders.append(o)

        # 2. VIROC (School Cheer - VIROC Yes) (10 records)
        viroc_schools = [
            ("Lincoln High School", "Lions", "Super Varsity", "Split", "SILVER 1:30", "1:30"),
            ("Oakridge Academy", "Eagles", "Medium Varsity", "No Split", "SILVER 2:00", "2:00"),
            ("Westlake High", "Wolverines", "Large Varsity", "Split", "GOLD 2:00", "2:00"),
            ("Valley View High", "Panthers", "Small Varsity", "No Split", "GOLD 2:30", "2:30"),
            ("Central High", "Bears", "Coed Varsity", "Split", "PLATINUM 2:00", "2:00"),
            ("Ridgeview High", "Rams", "Junior Varsity", "No Split", "PLATINUM 2:30", "2:30"),
            ("Pine Creek High", "Falcons", "Super Varsity", "Split", "TITANIUM 2:30", "2:30"),
            ("Eastland High", "Cougars", "Medium Varsity", "No Split", "RALLY MIX", "1:00"),
            ("Summit High School", "Skyhawks", "Small Varsity", "Split", "GOLD 2:00", "2:00"),
            ("Heritage High", "Patriots", "Large Varsity", "No Split", "PLATINUM 2:00", "2:00"),
        ]

        for i, (sch, mascot, div, split_opt, pkg, time_len) in enumerate(viroc_schools, 1):
            o = Order(
                form_type="school-all-star-cheer",
                cheer_form_subtype="school-cheer",
                varsity_viroc_customer="yes",
                category="Cheer",
                school_name=sch,
                school_billing_address=f"{200 + i} School Road",
                city="Austin",
                state_province="TX",
                zip_postal_code="78701",
                country="United States",
                mascot=mascot,
                division=div,
                team_coed_all_girl="Standard All-Girl" if i % 2 == 0 else "Coed",
                team_colors="Blue & Gold",
                number_of_copies="1",
                coach_name=f"Coach Mark {i}",
                coach_phone="555-020" + str(i),
                coach_email=f"mark.viroc{i}@example.com",
                billing_person_name=f"School Admin {i}",
                billing_person_email=f"admin.viroc{i}@school.edu",
                viroc_choreographer_name=f"Choreographer VIROC {i}",
                viroc_choreographer_email=f"viroc.choreo{i}@varsity.com",
                package_type=pkg,
                time_length_of_mix=time_len,
                split_or_no_split=split_opt,
                music_affiliate="Power Music + Unleash the Beats",
                sending_eight_count_sheets="Yes",
                song_list_suggestions=f"Top 40 Remix, Fight Song Integration, Hype Beat",
                routine_notes=f"VIROC choreography template attached. Clean transitions required.",
                coupon_code="VIROC2026",
                how_did_you_find_out="Varsity Representative",
                customer_name=f"Coach Mark {i} ({sch})",
                contact_name=f"Coach Mark {i}",
                program_name=sch,
                package=pkg,
                editor_request="FA",
                requested_editor="FA",
                requested_producer="FA",
                status="new",
                price=600.0 + (i * 15),
                price_compliance="compliant"
            )
            seeded_orders.append(o)

        # 3. School Cheer (VIROC No) (10 records)
        school_cheer_no_viroc = [
            ("Northside High", "Mustangs", "Medium Varsity", "Split", "SILVER 1:30", "1:30"),
            ("Southland High", "Spartans", "Small Varsity", "No Split", "SILVER 2:00", "2:00"),
            ("Meadowbrook High", "Colts", "Large Varsity", "Split", "GOLD 2:00", "2:00"),
            ("Highland Prep", "Highlanders", "Coed Varsity", "No Split", "GOLD 2:30", "2:30"),
            ("Timberline High", "Timberwolves", "Junior Varsity", "Split", "PLATINUM 2:00", "2:00"),
            ("Riverdale High", "Hawks", "Super Varsity", "No Split", "PLATINUM 2:30", "2:30"),
            ("Cedar Grove High", "Cardinals", "Medium Varsity", "Split", "TITANIUM 2:30", "2:30"),
            ("St. Clair Prep", "Saints", "Small Varsity", "No Split", "RALLY MIX", "1:00"),
            ("Mountain View High", "Mountaineers", "Large Varsity", "Split", "GOLD 2:00", "2:00"),
            ("Golden Valley High", "Grizzlies", "Coed Varsity", "No Split", "PLATINUM 2:00", "2:00"),
        ]

        for i, (sch, mascot, div, split_opt, pkg, time_len) in enumerate(school_cheer_no_viroc, 1):
            o = Order(
                form_type="school-all-star-cheer",
                cheer_form_subtype="school-cheer",
                varsity_viroc_customer="no",
                category="Cheer",
                school_name=sch,
                school_billing_address=f"{300 + i} Valley Blvd",
                city="Denver",
                state_province="CO",
                zip_postal_code="80201",
                country="United States",
                mascot=mascot,
                division=div,
                team_coed_all_girl="Standard All-Girl",
                team_colors="Green & Silver",
                number_of_copies="1",
                coach_name=f"Coach Jennifer {i}",
                coach_phone="555-030" + str(i),
                coach_email=f"jennifer.cheer{i}@example.com",
                billing_person_name=f"Treasurer {i}",
                billing_person_email=f"treasurer{i}@school.edu",
                choreographer_name=f"Independent Choreo {i}",
                choreographer_email=f"choreo.indie{i}@example.com",
                package_type=pkg,
                time_length_of_mix=time_len,
                split_or_no_split=split_opt,
                music_affiliate="Unleash the Beats",
                sending_eight_count_sheets="No",
                song_list_suggestions=f"Pop Anthem, Hype Beat drop",
                routine_notes=f"Traditional routine layout. Strong voiceover accents.",
                coupon_code=None,
                how_did_you_find_out="Google Search",
                customer_name=f"Coach Jennifer {i} ({sch})",
                contact_name=f"Coach Jennifer {i}",
                program_name=sch,
                package=pkg,
                editor_request="FA",
                requested_editor="FA",
                requested_producer="FA",
                status="new",
                price=500.0 + (i * 12),
                price_compliance="compliant"
            )
            seeded_orders.append(o)

        # 4. Youth Rec Cheer (10 records)
        youth_rec_programs = [
            ("Panther Youth Rec", "Little Panthers", "Blue & White", "BRONZE 1:00", "1:00"),
            ("Wildcat Rec Cheer", "Mini Wildcats", "Red & Black", "BRONZE 1:30", "1:30"),
            ("Spartan Youth Cheer", "Peewee Spartans", "Green & Gold", "BRONZE 1:45", "1:45"),
            ("Bulldog Youth Rec", "Junior Bulldogs", "Navy & Red", "BRONZE 2:00", "2:00"),
            ("Falcon Rec Squad", "Falcon Flyers", "Black & Silver", "BRONZE 2:15", "2:15"),
            ("Maverick Youth Cheer", "Mighty Mavs", "Orange & Navy", "BRONZE 2:30", "2:30"),
            ("Lions Rec Cheer", "Cub Lions", "Gold & Black", "BRONZE 1:30", "1:30"),
            ("Eagle Rec Athletics", "Soaring Eagles", "Teal & White", "BRONZE 2:00", "2:00"),
            ("Warriors Youth Cheer", "Mini Warriors", "Maroon & Gold", "BRONZE 1:45", "1:45"),
            ("Knights Youth Rec", "Little Knights", "Purple & Silver", "BRONZE 2:30", "2:30"),
        ]

        for i, (prog, team, colors, pkg, time_len) in enumerate(youth_rec_programs, 1):
            o = Order(
                form_type="school-all-star-cheer",
                cheer_form_subtype="youth-rec-cheer",
                category="Cheer",
                program_name=prog,
                team_name=team,
                colors=colors,
                team_colors=colors,
                billing_address=f"{400 + i} Community Park Dr",
                city="Orlando",
                state_province="FL",
                zip_postal_code="32801",
                country="United States",
                coach_contact_full_name=f"Coach Amanda {i}",
                coach_name=f"Coach Amanda {i}",
                coach_email_address=f"amanda.rec{i}@example.com",
                coach_email=f"amanda.rec{i}@example.com",
                email_address=f"amanda.rec{i}@example.com",
                package_type=pkg,
                package=pkg,
                time_length_of_mix=time_len,
                split_or_no_split="No Split",
                number_of_copies="1",
                sending_eight_count_sheets="No",
                using_eight_count_sheets="No",
                song_list_suggestions="Kid-friendly Pop hits, Upbeat tempo",
                routine_notes="Fun, energetic feel for young athletes.",
                coupon_code=None,
                how_did_you_find_out="Social Media",
                music_affiliate=None, # Youth Rec Cheer has no music affiliate
                customer_name=f"Coach Amanda {i} ({prog})",
                contact_name=f"Coach Amanda {i}",
                editor_request="FA",
                requested_editor="FA",
                requested_producer="FA",
                status="new",
                price=350.0 + (i * 10),
                price_compliance="compliant"
            )
            seeded_orders.append(o)

        # 5. Pom (10 records)
        pom_programs = [
            ("Westfield High Pom", "Varsity Pom", "DANCE MIX", "1:45"),
            ("St. Andrews Dance", "Junior Pom", "DANCE PLUS", "2:00"),
            ("Silverline Dance Academy", "Senior Pom Co.", "CUSTOM POM", "2:15"),
            ("Crestview Pom Squad", "Open Pom", "DANCE MIX", "1:30"),
            ("Lakeside Dance", "Varsity Pom", "DANCE PLUS", "2:00"),
            ("Hillcrest High Pom", "JV Pom", "CUSTOM POM", "2:30"),
            ("Brimstone Pom Team", "Varsity Pom", "DANCE MIX", "2:00"),
            ("Sunnyvale Dance", "Junior Pom", "DANCE PLUS", "2:15"),
            ("Veritas Prep Pom", "Senior Pom", "CUSTOM POM", "2:30"),
            ("Cascade High Pom", "Varsity Pom", "DANCE MIX", "1:45"),
        ]

        for i, (prog, div, pkg, time_len) in enumerate(pom_programs, 1):
            o = Order(
                form_type="school-all-star-dance",
                dance_form_subtype="pom",
                category="Dance",
                school_program_name=prog,
                school_address=f"{500 + i} Dance Ave",
                city="Minneapolis",
                state_province="MN",
                zip_postal_code="55401",
                country="United States",
                division=div,
                coach_name=f"Coach Jessica {i}",
                coach_phone="555-050" + str(i),
                coach_email=f"jessica.pom{i}@example.com",
                billing_person_name=f"Dance Booster {i}",
                billing_person_email=f"booster{i}@dance.org",
                choreographer_name=f"Pom Choreographer {i}",
                choreographer_email=f"pom.choreo{i}@example.com",
                number_of_copies="2",
                package_type=pkg,
                time_length_of_mix=time_len,
                music_affiliate="Power Music Covers" if i % 2 == 0 else "Unleash the Beats Covers",
                routine_notes="Heavy kick and turn section beats. Crisp pom accents.",
                custom_voiceovers="Yes" if i % 2 == 0 else "No",
                coupon_code=f"DANCE2026_{i}" if i % 4 == 0 else None,
                customer_name=f"Coach Jessica {i} ({prog})",
                contact_name=f"Coach Jessica {i}",
                program_name=prog,
                package=pkg,
                editor_request="FA",
                requested_editor="FA",
                requested_producer="FA",
                status="new",
                price=450.0 + (i * 15),
                price_compliance="compliant"
            )
            seeded_orders.append(o)

        # 6. Hip Hop (10 records - no division)
        hip_hop_programs = [
            ("Urban Rhythm Dance", "DANCE MIX", "1:45"),
            ("Metro Hip Hop Crew", "DANCE PLUS", "2:00"),
            ("Vibe Dance Studio", "CUSTOM POM", "2:15"),
            ("Street Beat Academy", "DANCE MIX", "2:00"),
            ("Pulse Dance Crew", "DANCE PLUS", "2:30"),
            ("Groove Nation", "CUSTOM POM", "2:00"),
            ("Rhythm & Hype", "DANCE MIX", "1:30"),
            ("Beat Factory Dance", "DANCE PLUS", "2:15"),
            ("Velocity Hip Hop", "CUSTOM POM", "2:30"),
            ("Synergy Street Crew", "DANCE MIX", "2:00"),
        ]

        for i, (prog, pkg, time_len) in enumerate(hip_hop_programs, 1):
            o = Order(
                form_type="school-all-star-dance",
                dance_form_subtype="hip-hop",
                category="Dance",
                school_program_name=prog,
                school_address=f"{600 + i} Beat Street",
                city="Los Angeles",
                state_province="CA",
                zip_postal_code="90001",
                country="United States",
                division=None, # Hip Hop has NO division field
                coach_name=f"Coach Tyler {i}",
                coach_phone="555-060" + str(i),
                coach_email=f"tyler.hiphop{i}@example.com",
                billing_person_name=f"Studio Owner {i}",
                billing_person_email=f"owner{i}@hiphopstudio.com",
                choreographer_name=f"Street Choreo {i}",
                choreographer_email=f"street.choreo{i}@example.com",
                number_of_copies="1",
                package_type=pkg,
                time_length_of_mix=time_len,
                music_affiliate="Power Music Covers",
                routine_notes="Hard hitting bass, smooth breakdown transition at 1:10.",
                custom_voiceovers="No",
                coupon_code=None,
                customer_name=f"Coach Tyler {i} ({prog})",
                contact_name=f"Coach Tyler {i}",
                program_name=prog,
                package=pkg,
                editor_request="FA",
                requested_editor="FA",
                requested_producer="FA",
                status="new",
                price=475.0 + (i * 10),
                price_compliance="compliant"
            )
            seeded_orders.append(o)

        # 7. Team Performance & Variety (10 records)
        tp_programs = [
            ("Evergreen Performance Team", "Varsity Performance", "Variety", "TP MIX", "2:00"),
            ("Northern Lights Dance", "Open Performance", "Jazz/Pom/Hip Hop Blend", "TP PLUS MIX", "2:30"),
            ("Highland Park Variety", "JV Variety", "Kick/Pom Combo", "TP MIX", "2:00"),
            ("Pacific Performance Studio", "Senior Performance", "Variety", "TP PLUS MIX", "2:30"),
            ("Precision Dance Co.", "Varsity Variety", "Jazz/Pom/Hip Hop Blend", "TP MIX", "2:15"),
            ("Summit Variety Team", "Junior Performance", "Variety", "TP PLUS MIX", "2:00"),
            ("Golden Gate Dance", "Varsity Performance", "Kick/Pom Combo", "TP MIX", "2:30"),
            ("Coastal Performance", "Open Variety", "Variety", "TP PLUS MIX", "2:15"),
            ("Royal Variety Squad", "JV Performance", "Jazz/Pom/Hip Hop Blend", "TP MIX", "2:00"),
            ("Apex Dance Ensemble", "Senior Variety", "Variety", "TP PLUS MIX", "2:30"),
        ]

        for i, (prog, div, style_opt, pkg, time_len) in enumerate(tp_programs, 1):
            o = Order(
                form_type="school-all-star-dance",
                dance_form_subtype="team-performance",
                category="Dance",
                school_program_name=prog,
                school_address=f"{700 + i} Pacific Highway",
                city="Seattle",
                state_province="WA",
                zip_postal_code="98101",
                country="United States",
                division=div,
                coach_name=f"Coach Rachel {i}",
                coach_phone="555-070" + str(i),
                coach_email=f"rachel.tp{i}@example.com",
                billing_person_name=f"Program Director {i}",
                billing_person_email=f"director{i}@performance.org",
                choreographer_name=f"Variety Choreographer {i}",
                choreographer_email=f"variety.choreo{i}@example.com",
                number_of_copies="2",
                package_type=pkg,
                time_length_of_mix=time_len,
                music_affiliate="Unleash the Beats Covers",
                routine_notes=f"Style changes: Pom at 0:00, Jazz at 0:45, Hip Hop finish. Style: {style_opt}.",
                custom_voiceovers="Yes",
                coupon_code=None,
                customer_name=f"Coach Rachel {i} ({prog})",
                contact_name=f"Coach Rachel {i}",
                program_name=prog,
                package=pkg,
                editor_request="FA",
                requested_editor="FA",
                requested_producer="FA",
                status="new",
                price=525.0 + (i * 15),
                price_compliance="compliant"
            )
            seeded_orders.append(o)

        # 8. Gameday (10 records - no division)
        gameday_programs = [
            ("State University Gameday", "Traditional Fight Song & Chant", "PERFORMANCE MIX", "1:30"),
            ("Cardinal Gameday Dance", "High Energy Timeout", "PERFORMANCE PLUS", "2:00"),
            ("Tigers Spirit Squad", "Sideline Cheer & Stunt", "PERFORMANCE EXTREME", "2:30"),
            ("Longhorns Gameday", "Traditional Fight Song & Chant", "PERFORMANCE MIX", "1:30"),
            ("Wildcats Spirit Team", "High Energy Timeout", "PERFORMANCE PLUS", "2:00"),
            ("Hawks Gameday Crew", "Sideline Cheer & Stunt", "PERFORMANCE EXTREME", "2:15"),
            ("Bears Gameday Squad", "Traditional Fight Song & Chant", "PERFORMANCE MIX", "2:00"),
            ("Aggies Spirit Dance", "High Energy Timeout", "PERFORMANCE PLUS", "2:30"),
            ("Badgers Gameday", "Sideline Cheer & Stunt", "PERFORMANCE EXTREME", "2:00"),
            ("Volunteers Spirit Team", "Traditional Fight Song & Chant", "PERFORMANCE MIX", "1:45"),
        ]

        for i, (prog, gameday_style, pkg, time_len) in enumerate(gameday_programs, 1):
            o = Order(
                form_type="school-all-star-dance",
                dance_form_subtype="gameday",
                category="Dance",
                school_program_name=prog,
                school_address=f"{800 + i} Stadium Way",
                city="Columbus",
                state_province="OH",
                zip_postal_code="43201",
                country="United States",
                division=None, # Gameday has NO division field
                coach_name=f"Coach David {i}",
                coach_phone="555-080" + str(i),
                coach_email=f"david.gameday{i}@example.com",
                billing_person_name=f"Athletic Dept {i}",
                billing_person_email=f"athletics{i}@university.edu",
                choreographer_name=f"Gameday Choreo {i}",
                choreographer_email=f"gameday.choreo{i}@example.com",
                number_of_copies="1",
                package_type=pkg,
                time_length_of_mix=time_len,
                music_affiliate="Power Music Covers",
                routine_notes=f"Stadium anthem vibes. Clear drumline rhythm. Style: {gameday_style}.",
                custom_voiceovers="No",
                coupon_code=None,
                customer_name=f"Coach David {i} ({prog})",
                contact_name=f"Coach David {i}",
                program_name=prog,
                package=pkg,
                editor_request="FA",
                requested_editor="FA",
                requested_producer="FA",
                status="new",
                price=400.0 + (i * 10),
                price_compliance="compliant"
            )
            seeded_orders.append(o)

        # 9. Jazz/Kick (10 records)
        jazz_kick_programs = [
            ("Elite Jazz Ensemble", "Varsity Jazz", "Jazz", "JAZZ/KICK MIX", "2:00"),
            ("High Kick Varsity", "Senior Kick", "High Kick", "JAZZ/KICK MIX", "2:30"),
            ("Precision Kickers", "JV Kick", "High Kick", "JAZZ SIMPLE CUT", "1:45"),
            ("Symphonic Jazz Dance", "Open Jazz", "Lyrical Jazz", "JAZZ/KICK MIX", "2:15"),
            ("Artistry Jazz Studio", "Senior Jazz", "Jazz", "JAZZ SIMPLE CUT", "2:00"),
            ("Kickline Academy", "Varsity Kick", "High Kick", "JAZZ/KICK MIX", "2:30"),
            ("Velvet Jazz Crew", "JV Jazz", "Jazz", "JAZZ SIMPLE CUT", "1:30"),
            ("Starlight Kick Squad", "Junior Kick", "High Kick", "JAZZ/KICK MIX", "2:00"),
            ("Illumination Jazz", "Varsity Jazz", "Lyrical Jazz", "JAZZ SIMPLE CUT", "2:15"),
            ("Majestic Kickers", "Senior Kick", "High Kick", "JAZZ/KICK MIX", "2:30"),
        ]

        for i, (prog, div, style_opt, pkg, time_len) in enumerate(jazz_kick_programs, 1):
            o = Order(
                form_type="school-all-star-dance",
                dance_form_subtype="jazz-kick",
                category="Dance",
                school_program_name=prog,
                school_address=f"{900 + i} Symphony Hall Dr",
                city="Chicago",
                state_province="IL",
                zip_postal_code="60601",
                country="United States",
                division=div,
                coach_name=f"Coach Lauren {i}",
                coach_phone="555-090" + str(i),
                coach_email=f"lauren.jazz{i}@example.com",
                billing_person_name=f"Fine Arts Chair {i}",
                billing_person_email=f"arts{i}@school.org",
                choreographer_name=f"Jazz Master {i}",
                choreographer_email=f"jazz.master{i}@example.com",
                number_of_copies="1",
                package_type=pkg,
                time_length_of_mix=time_len,
                music_affiliate="Power Music Covers",
                routine_notes=f"Precision tempo required for kick sequence. Style: {style_opt}.",
                custom_voiceovers="No",
                coupon_code=None,
                customer_name=f"Coach Lauren {i} ({prog})",
                contact_name=f"Coach Lauren {i}",
                program_name=prog,
                package=pkg,
                editor_request="FA",
                requested_editor="FA",
                requested_producer="FA",
                status="new",
                price=420.0 + (i * 12),
                price_compliance="compliant"
            )
            seeded_orders.append(o)

        # 10. Marching Band (10 records - no music affiliate, no coupon code)
        marching_band_programs = [
            ("Lakeside Marching Band", "BAND CHANT", "1:30"),
            ("Centennial Marching Band", "DRUM CADENCE ORIGINAL", "1:45"),
            ("Pride of the Valley Band", "FIGHT SONG / ALMA MATER", "2:00"),
            ("Highland Marching Panthers", "FIGHT SONG / ALMA MATER PLUS (Written & Recorded Lyrics)", "2:30"),
            ("Royal Sound Band", "BAND CHANT", "1:30"),
            ("Blue Devils Marching Band", "DRUM CADENCE ORIGINAL", "2:00"),
            ("Sound of Spirit Band", "FIGHT SONG / ALMA MATER", "2:15"),
            ("Patriot Marching Band", "FIGHT SONG / ALMA MATER PLUS (Written & Recorded Lyrics)", "2:30"),
            ("Heritage Brass & Drum", "BAND CHANT", "1:45"),
            ("Golden Marching Band", "DRUM CADENCE ORIGINAL", "2:00"),
        ]

        for i, (prog, pkg, time_len) in enumerate(marching_band_programs, 1):
            o = Order(
                form_type="marching-band",
                category="Marching Band",
                school_program_name=prog,
                school_address=f"{1000 + i} Band Field Rd",
                city="Indianapolis",
                state_province="IN",
                zip_postal_code="46201",
                country="United States",
                coach_name=f"Director Robert {i}",
                coach_phone="555-100" + str(i),
                coach_email=f"robert.band{i}@example.com",
                billing_person_name=f"Band Boosters {i}",
                billing_person_email=f"bandbooster{i}@school.edu",
                package_type=pkg,
                time_length_of_mix=time_len,
                routine_notes=f"Instrumentation: Full Brass & Percussion. Notes: Emphasize trumpet solo section and snare cadence.",
                music_affiliate=None, # No music affiliate for Marching Band
                coupon_code=None,     # No coupon code for Marching Band
                customer_name=f"Director Robert {i} ({prog})",
                contact_name=f"Director Robert {i}",
                program_name=prog,
                package=pkg,
                editor_request="FA",
                requested_editor="FA",
                requested_producer="FA",
                status="new",
                price=650.0 + (i * 20),
                price_compliance="compliant"
            )
            seeded_orders.append(o)

        # 11. Sports Entertainment (10 records - 1 TBD manual price)
        sports_ent_programs = [
            ("Bay Area Blazers Basketball", "QUARTER BREAK / TIMEOUT REMIXED", "1:00", False),
            ("Midwest Ice Hockey Org", "PRE-GAME / HALFTIME REMIXED", "2:00", False),
            ("Metro Arena Entertainment", "QUARTER BREAK / TIMEOUT REMIXED", "1:30", False),
            ("Thunderbolts Baseball", "PRE-GAME / HALFTIME REMIXED", "2:30", False),
            ("Titanium Arena Sports", "QUARTER BREAK / TIMEOUT REMIXED", "1:00", False),
            ("Racer X Motor Sports", "PRE-GAME / HALFTIME REMIXED", "2:00", False),
            ("Global Arena Events", "QUARTER BREAK / TIMEOUT REMIXED", "1:30", False),
            ("Velocity Pro Sports", "PRE-GAME / HALFTIME REMIXED", "2:15", False),
            ("Slam Dunk Productions", "QUARTER BREAK / TIMEOUT REMIXED", "1:00", False),
            ("Frontier Arena League", "OTHER (mixes longer than 2:30)", "3:30", True), # 1 TBD record
        ]

        for i, (prog, pkg, time_len, is_tbd) in enumerate(sports_ent_programs, 1):
            o = Order(
                form_type="sports-entertainment",
                category="Sports Entertainment",
                school_program_name=prog,
                program_name=prog,
                school_address=f"{1100 + i} Commercial Arena Way",
                billing_address=f"{1100 + i} Commercial Arena Way",
                city="Atlanta",
                state_province="GA",
                zip_postal_code="30301",
                country="United States",
                coach_name=f"Contact Chris {i}",
                coach_phone="555-110" + str(i),
                coach_email=f"chris.sports{i}@example.com",
                billing_person_name=f"Accounts Payable {i}",
                billing_person_email=f"ap{i}@arena.com",
                package_type=pkg,
                time_length_of_mix=time_len,
                song_list_suggestions=f"Arena hype beats,organ remixes,crowd chants",
                routine_notes=f"Notes: High volume arena mix. Rush order: {'Yes' if i % 2 == 0 else 'No'}.",
                needs_attention=is_tbd,
                attention_reason="TBD / Manual Pricing Required via Email (Mix > 2:30)" if is_tbd else None,
                music_affiliate=None,
                coupon_code=None,
                customer_name=f"Contact Chris {i} ({prog})",
                contact_name=f"Contact Chris {i}",
                package=pkg,
                editor_request="FA",
                requested_editor="FA",
                requested_producer="FA",
                status="new",
                price=0.0 if is_tbd else (700.0 + (i * 25)),
                price_compliance="needs_review" if is_tbd else "compliant"
            )
            seeded_orders.append(o)

        # 12. School Anthems (10 records)
        school_anthems = [
            ("St. Jude Academy", "Saints", "Gold & Navy", "SCHOOL ANTHEMS", "2:00"),
            ("Monument Valley High", "Mustangs", "Red & White", "SCHOOL ANTHEMS", "2:15"),
            ("Vanguard Institute", "Knights", "Purple & Silver", "SCHOOL ANTHEMS", "2:30"),
            ("Liberty High School", "Patriots", "Blue & Red", "SCHOOL ANTHEMS", "2:00"),
            ("Horizon Prep", "Hawks", "Green & Black", "SCHOOL ANTHEMS", "2:15"),
            ("Valor Christian High", "Eagles", "Navy & Gold", "SCHOOL ANTHEMS", "2:30"),
            ("Trinity Prep", "Lions", "Maroon & White", "SCHOOL ANTHEMS", "2:00"),
            ("Legacy Academy", "Titans", "Black & Gold", "SCHOOL ANTHEMS", "2:15"),
            ("Covenant High School", "Cougars", "Teal & Silver", "SCHOOL ANTHEMS", "2:30"),
            ("Bellevue Academy", "Bears", "Orange & Navy", "SCHOOL ANTHEMS", "2:00"),
        ]

        for i, (sch, mascot, colors, pkg, time_len) in enumerate(school_anthems, 1):
            o = Order(
                form_type="school-anthem",
                category="School Anthem",
                school_program_name=sch,
                school_address=f"{1200 + i} Campus Drive",
                city="Nashville",
                state_province="TN",
                zip_postal_code="37201",
                country="United States",
                mascot=mascot,
                colors=colors,
                team_colors=colors,
                coach_name=f"Music Director Kevin {i}",
                coach_phone="555-120" + str(i),
                coach_email=f"kevin.anthem{i}@example.com",
                billing_person_name=f"School Board {i}",
                billing_person_email=f"board{i}@school.edu",
                package_type=pkg,
                time_length_of_mix=time_len,
                routine_notes=f"Nicknames: {mascot}. Vocals: Full Male/Female Choir. Style: Cinematic Orchestral.",
                coupon_code=f"ANTHEM{i}" if i % 5 == 0 else None,
                music_affiliate=None,
                customer_name=f"Director Kevin {i} ({sch})",
                contact_name=f"Director Kevin {i}",
                program_name=sch,
                package=pkg,
                editor_request="FA",
                requested_editor="FA",
                requested_producer="FA",
                status="new",
                price=800.0 + (i * 30),
                price_compliance="compliant"
            )
            seeded_orders.append(o)

        print(f"Prepared {len(seeded_orders)} total order objects across 12 subtypes.")

        # Bulk add and commit
        db.add_all(seeded_orders)
        db.commit()

        total_after = db.query(Order).count()
        print(f"Successfully seeded! Total orders in DB now: {total_after}")

    except Exception as e:
        db.rollback()
        print(f"Error seeding orders: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_all_orders()

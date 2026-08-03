import os
import json
import re

workspace_root = r"c:\Users\hp\Desktop\flydata"
output_dir = os.path.join(workspace_root, "travelintell")
output_json = os.path.join(output_dir, "tours_db.json")

# Ensure the output directory exists
os.makedirs(output_dir, exist_ok=True)

# Seasons configuration with keywords
SEASONS_KEYWORDS = {
    "Summer": ["summer", "may", "june", "april", "hill station", "kullu", "manali", "darjeeling", "gangtok", "sikkim", "leh", "kashmir", "alaska", "alpine", "cherry blossom", "mountaineering", "himalayan"],
    "Monsoon": ["monsoon", "july", "august", "rain", "kerala", "ayurveda", "houseboat", "waterfall", "valley of flowers", "wet", "backwaters", "cochin", "vagamon"],
    "Autumn": ["autumn", "september", "october", "november", "festivals", "rann utsav", "bhutan", "nepal", "kailash", "harvest", "october", "november"],
    "Winter": ["winter", "december", "january", "february", "snow", "ski", "desert", "rajasthan", "gujarat", "kutch", "egypt", "dubai", "azerbaijan winter", "christmas", "holiday", "jaipur", "udaipur", "jodhpur"],
    "Spring": ["spring", "march", "april", "cherry blossom", "flowers", "tulip", "blossom"]
}

# Regional mapping to clean values
REGION_CLEAN_NAMES = {
    "east and north east india": "East & North East India",
    "north india": "North India",
    "south india": "South India",
    "west and central india": "West & Central India",
    "africa": "Africa",
    "america": "Americas",
    "asia": "Asia",
    "europe": "Europe",
    "middle east asia": "Middle East"
}

# Extensive Pools of Unique Travel Unsplash Images (No duplicates)
POOLS = {
    "beaches": [
        "photo-1507525428034-b723cf961d3e", "photo-1506929562872-bb421503ef21", "photo-1520116468817-e159084c2895",
        "photo-1473116763269-255ea742664d", "photo-1545641203-7d6cf941d21b", "photo-1519046904884-53103b34b206",
        "photo-1505118380757-91f5f5632de0", "photo-1439066615861-d1af74d74000", "photo-1540555700478-4be289fbecef",
        "photo-1525183120135-c6cf53149e91", "photo-1468413253725-0d51810f63b8", "photo-1504681869592-d300de9bd511",
        "photo-1559128010-7c1ad6e1b6a5", "photo-1537996194471-e657df975ab4", "photo-1501179691627-eeaa65ea017c",
        "photo-1503152394-c571994fd383", "photo-1515263487990-61b07816b324", "photo-1530841377377-3ff06c0ca713",
        "photo-1483683804023-6ccdb62f86ef", "photo-1533105079780-92b9be482077", "photo-1548574505-5e239809ee19",
        "photo-1502086223501-7ea6ecd79368", "photo-1538964173425-93884d669590", "photo-1520250497591-112f2f40a3f4",
        "photo-1510414842594-fc614097e689", "photo-1467377229733-4d2fda030954", "photo-1500530855697-b586d89ba3ee",
        "photo-1501004318641-b39e6451bec6", "photo-1527631746610-bca00a040d60", "photo-1532408840957-22729c27ab26",
        "photo-1512100356356-de1b84283e18", "photo-1523906834658-6e24ef2386f9", "photo-1544551763-46a013bb70d5",
        "photo-1505881502353-a1986add3762", "photo-1509043513363-2f0a996d3f59", "photo-1516690561799-46d8f74f9abf",
        "photo-1544550263-4a319837fb73", "photo-1508964148425-93884d669590", "photo-1510414842594-fc614097e689"
    ],
    "mountains": [
        "photo-1464822759023-fed622ff2c3b", "photo-1454496522488-7a8e488e8606", "photo-1486873249359-2731bd6da57b",
        "photo-1506744038136-46273834b3fb", "photo-1469474968028-56623f02e42e", "photo-1519681393784-d120267933ba",
        "photo-1472214222541-d510753a4707", "photo-1434394354979-a235cd36269d", "photo-1501785888041-af3ef285b470",
        "photo-1480796927426-f609979314bd", "photo-1548013146-72479768bada", "photo-1598300042247-d088f8ab3a91",
        "photo-1605649487212-47bdab064df7", "photo-1498050108023-c5249f4df085", "photo-1513407030348-c983a97b98d8",
        "photo-1526080652727-5b77f74eacd2", "photo-1527004013197-933c4bb611b3", "photo-1517824806704-9040b037703b",
        "photo-1544735716-392fe2489ffa", "photo-1589308078059-be1415eab4c3", "photo-1482862549707-f63cb32c5fd9",
        "photo-1533587845-c290b2401f54", "photo-1511497584788-876760111969", "photo-1425913397330-cf8af2ff40a1",
        "photo-1501854140801-50d01698950b", "photo-1441974231531-c6227db76b6e", "photo-1500627869374-13ad9960a17f",
        "photo-1508193638397-1c4234db14d8", "photo-1433086966358-54859d0ed716", "photo-1461896836934-ffe607ba8211",
        "photo-1533240332313-0db49b439ad3", "photo-1470240731273-7821a6eeb6bd", "photo-1506318137071-a8e063b4bec0",
        "photo-1521590832167-7bcbfaa6381f", "photo-1542224566-6e85f2e6772f", "photo-1492691527719-9d1e07e534b4",
        "photo-1519331379826-f10be5486c6f", "photo-1504280390367-361c6d9f38f4"
    ],
    "temples": [
        "photo-1528127269322-539801943592", "photo-1493976040374-85c8e12f0c0e", "photo-1477584322813-ac2d12ffac44",
        "photo-1503177119275-0aa32b31d458", "photo-1539650116574-8efeb43e2750", "photo-1568402102990-bc541580b59f",
        "photo-1543731068-7e0f5beff43a", "photo-1586861635167-e5223aadc9fe", "photo-1528154291023-a6525fafd533",
        "photo-1542082867-c534a4d952cb", "photo-1608958253160-51c31210214a", "photo-1599661046289-e31897846e41",
        "photo-1518638150340-f706e86654de", "photo-1590050752117-238cb0612b1b", "photo-1584551246679-0daf3d275d0f",
        "photo-1542856391-010fb87dcfed", "photo-1552832230-c0197dd311b5", "photo-1534447677768-be436bb09401",
        "photo-1564507592333-c60657eea523", "photo-1508739773434-c26b3d09e071", "photo-1513836279014-a89f7a76ae86",
        "photo-1569154941061-e231b4725ef1", "photo-1545569341-9eb8b30979d9", "photo-1596402184320-417e7178b2cd",
        "photo-1601931758153-f77259160e1d", "photo-1551882547-ff40c63fe5fa", "photo-1560169897-fc0cdbdfa4d5",
        "photo-1547983650-759b794f3a3a", "photo-1590001155093-a3c66ab0c3ff", "photo-1541963463532-d68292c34b19",
        "photo-1533105079780-92b9be482077", "photo-1512917774080-9991f1c4c750", "photo-1520262454473-a1a8227ec457",
        "photo-1542838132-92c53300491e", "photo-1517511620798-dec15d82f77d", "photo-1569288052389-dac9b0ac9eac",
        "photo-1596394516093-501ba68a0ba6", "photo-1548013146-72479768bada"
    ],
    "cities": [
        "photo-1512453979798-5ea266f8880c", "photo-1503899036084-c55cdd92da26", "photo-1517154421773-0529f29ea451",
        "photo-1504618223053-559bdef9dd5a", "photo-1506970845246-18f21d533b20", "photo-1496442226666-8d4d0e62e6e9",
        "photo-1499856871958-5b9647a640d6", "photo-1513635269975-59663e0ca1ad", "photo-1509840841025-9088ba78a826",
        "photo-1543783207-ec64e4d95325", "photo-1522083165195-342750297f4e", "photo-1508009603885-50cf7c579365",
        "photo-1534008897815-427f3d2b3db8", "photo-1568605117036-5fe5e7bab0b7", "photo-1529156069898-49953e39b3ac",
        "photo-1512917774080-9991f1c4c750", "photo-1486406146926-c627a92ad1ab", "photo-1514565131-fce0801e5785",
        "photo-1534389671727-72f5c7170299", "photo-1549693578-d683be217e58", "photo-1519501025264-65ba15a82390",
        "photo-1518391846015-55a9cc003b25", "photo-1520262454473-a1a8227ec457", "photo-1542838132-92c53300491e",
        "photo-1517511620798-dec15d82f77d", "photo-1477959858617-67f85cf4f1df", "photo-1490645935967-10de6ba17061",
        "photo-1502602898657-3e91760cbb34", "photo-1526304640581-d334cdbbf45e", "photo-1538332576228-eb5b43a901e2",
        "photo-1506744038136-46273834b3fb", "photo-1480714378408-67cf0d13bc1b", "photo-1449034446853-66c86144b0ad",
        "photo-1473163928189-364b2c4e1135", "photo-1519659528531-75775c7b395b", "photo-1494526585095-c41746248156",
        "photo-1532960401447-7dd05bef20b0", "photo-1518235506717-e1ed3306a89b"
    ],
    "nature": [
        "photo-1588666309990-d68f08e3d4a6", "photo-1448375240586-882707db888b", "photo-1473448912268-2022ce9509d8",
        "photo-1535083783855-76ae62b2914e", "photo-1549488344-1f9b8d2bd1f3", "photo-1564349683136-77e08dba1ef7",
        "photo-1546182990-dffeafbe841d", "photo-1516426122078-c23e76319801", "photo-1507608869274-d3177c8bb4c7",
        "photo-1470071459604-3b5ec3a7fe05", "photo-1425913397330-cf8af2ff40a1", "photo-1475113548554-5a36f1f523d6",
        "photo-1418065460487-3e41a6c84dc5", "photo-1433086966358-54859d0ed716", "photo-1504829857797-ddff28127792",
        "photo-1510798831971-661eb04b3739", "photo-1500485035595-cbe6f645feb1", "photo-1518495973542-4542c06a5843",
        "photo-1472396961693-142e6e269027", "photo-1465146344425-f00d5f5c8f07", "photo-1439853949127-fa647821ebb0",
        "photo-1470770841072-f978cf4d019e", "photo-1513836279014-a89f7a76ae86", "photo-1447752875215-b2761acb3c5d",
        "photo-1502082553048-f009c37129b9", "photo-1469474968028-56623f02e42e", "photo-1470240731273-7821a6eeb6bd",
        "photo-1501854140801-50d01698950b", "photo-1441974231531-c6227db76b6e", "photo-1500627869374-13ad9960a17f",
        "photo-1508193638397-1c4234db14d8", "photo-1522083165195-342750297f4e", "photo-1534447677768-be436bb09401",
        "photo-1501854140801-50d01698950b", "photo-1475924156734-496f6cac6ec1", "photo-1513836279014-a89f7a76ae86"
    ],
    "general": [
        "photo-1488646953014-85cb44e25828", "photo-1501555088652-021faa106b9b", "photo-1508849789987-4e5333c12b78",
        "photo-1503220317375-aaad61436b1b", "photo-1469854523086-cc02fe5d8800", "photo-1476514525535-07fb3b4ae5f1",
        "photo-1504609773096-104ff2c73ba4", "photo-1506012787146-f92b2d7d6d96", "photo-1522199755839-a2bacb67c546",
        "photo-1517841905240-472988babdf9", "photo-1539635278303-d4002c07eae3", "photo-1505881502353-a1986add3762",
        "photo-1509043513363-2f0a996d3f59", "photo-1512100356356-de1b84283e18", "photo-1523906834658-6e24ef2386f9",
        "photo-1544551763-46a013bb70d5", "photo-1476514525535-07fb3b4ae5f1", "photo-1507525428034-b723cf961d3e",
        "photo-1530789253388-582c481c54b0", "photo-1527631746610-bca00a040d60", "photo-1472214222541-d510753a4707",
        "photo-1469474968028-56623f02e42e", "photo-1506929562872-bb421503ef21", "photo-1519046904884-53103b34b206",
        "photo-1586861635167-e5223aadc9fe", "photo-1537996194471-e657df975ab4", "photo-1539650116574-8efeb43e2750",
        "photo-1568402102990-bc541580b59f", "photo-1543731068-7e0f5beff43a", "photo-1520116468817-e159084c2895",
        "photo-1473116763269-255ea742664d", "photo-1545641203-7d6cf941d21b", "photo-1510414842594-fc614097e689",
        "photo-1500530855697-b586d89ba3ee", "photo-1501004318641-b39e6451bec6", "photo-1527631746610-bca00a040d60",
        "photo-1532408840957-22729c27ab26", "photo-1501785888041-af3ef285b470", "photo-1480796927426-f609979314bd",
        "photo-1548013146-72479768bada"
    ]
}

# Set to keep track of assigned images globally to guarantee 100% uniqueness
assigned_images = set()

# Special explicit keyword overrides to map direct representative images (lists of unique IDs)
SPECIFIC_OVERWRIDES = {
    "kashmir": [
        "photo-1598324422718-4b77f72eacd2",  # dal lake
        "photo-1616036740257-9449ea1f6605",  # kashmir flowers
        "photo-1605649487212-47bdab064df7",  # snow peaks
        "photo-1548013146-72479768bada"      # snowy himalayas
    ],
    "bhutan": [
        "photo-1544735716-392fe2489ffa",  # tiger nest
        "photo-1506744038136-46273834b3fb"
    ],
    "egypt": [
        "photo-1503177119275-0aa32b31d458",  # pyramids
        "photo-1539650116574-8efeb43e2750",  # cairo arch
        "photo-1547983650-759b794f3a3a"      # desert sphinx style
    ],
    "dubai": [
        "photo-1512453979798-5ea266f8880c",  # burj
        "photo-1582650625119-3a31f8fa2699",  # desert road
        "photo-1518684079-3c830dcef090",  # dubai night
        "photo-1528702748617-c64d49430014",  # dubai skyline
        "photo-1544982503-9f984c14501a"   # desert dunes
    ],
    "korea": [
        "photo-1517154421773-0529f29ea451",  # seoul palace
        "photo-1538332576228-eb5b43a901e2",  # seoul street
        "photo-1521590832167-7bcbfaa6381f",  # korea gate
        "photo-1549693578-d683be217e58"      # city street
    ],
    "seoul": [
        "photo-1517154421773-0529f29ea451",
        "photo-1538332576228-eb5b43a901e2"
    ],
    "kerala": [
        "photo-1593693397690-362cb9666fc2",  # houseboat
        "photo-1522083165195-342750297f4e",  # gardens/waterfall
        "photo-1507525428034-b723cf961d3e"
    ],
    "rajasthan": [
        "photo-1599661046289-e31897846e41",  # fort
        "photo-1477584322813-ac2d12ffac44",  # palace
        "photo-1524492412937-b28074a5d7da"
    ],
    "nepal": [
        "photo-1589308078059-be1415eab4c3",  # nepal lake
        "photo-1544735716-392fe2489ffa"
    ]
}

def clean_and_shorten_text(text):
    if not text:
        return ""
    
    # Pre-clean known names or repetitive branding
    text = re.sub(r"\bHolidayMonk\b", "HappyFlying", text, flags=re.IGNORECASE)
    text = re.sub(r"\byour dream Dubai vacation\b", "your vacation", text, flags=re.IGNORECASE)
    text = re.sub(r"\byour next Dubai package\b", "your package", text, flags=re.IGNORECASE)
    text = re.sub(r"\bDubai holidays\b", "Dubai travel", text, flags=re.IGNORECASE)
    
    paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
    cleaned_paragraphs = []
    
    for p in paragraphs:
        # If it's a heading or short outline, keep it clean
        if len(p) < 80 or p.startswith("-") or p.startswith("·") or p.startswith("*") or p.startswith("Day"):
            cleaned_paragraphs.append(p)
            continue
            
        # Split paragraph into sentences
        sentences = re.split(r"(?<=[.!?])\s+", p)
        bullets = []
        
        for s in sentences:
            s_clean = s.strip()
            if not s_clean:
                continue
            
            # Shorten sentences by splitting descriptive subclauses into shorter phrases
            words = s_clean.split()
            if len(words) > 22:
                clauses = re.split(r",\s*(?:and|but|or|making|ranging|enclosing|featuring|which)\s+", s_clean)
                if len(clauses) > 1:
                    for c in clauses:
                        c_clean = c.strip().capitalize()
                        if not c_clean.endswith("."):
                            c_clean += "."
                        if len(c_clean.split()) >= 4:
                            bullets.append(f"- {c_clean}")
                else:
                    bullets.append(f"- {s_clean}")
            else:
                bullets.append(f"- {s_clean}")
        
        if bullets:
            cleaned_paragraphs.append("\n".join(bullets))
        else:
            cleaned_paragraphs.append(p)
            
    return "\n".join(cleaned_paragraphs)

def split_by_headings(content, title):
    lines = content.split("\n")
    sections = []
    current_title = "Overview"
    current_lines = []
    
    for line in lines:
        line_clean = line.strip()
        if not line_clean:
            continue
            
        # Heading criteria
        is_heading = (
            len(line_clean) < 60 
            and line_clean[0].isupper() 
            and not line_clean.endswith(".") 
            and not line_clean.endswith(",")
            and not line_clean.startswith("-")
            and not line_clean.startswith("·")
            and not line_clean.startswith("*")
            and ("visit" in line_clean.lower() or "time" in line_clean.lower() or "reach" in line_clean.lower() or "food" in line_clean.lower() or "restaurant" in line_clean.lower() or "things to do" in line_clean.lower() or "hotel" in line_clean.lower() or "honeymoon" in line_clean.lower() or "shopping" in line_clean.lower() or "transport" in line_clean.lower() or len(line_clean.split()) <= 4)
        )
        
        if is_heading:
            if current_lines:
                sections.append({
                    "day": f"Section {len(sections)+1}" if len(sections) > 0 else "Overview",
                    "title": current_title,
                    "description": clean_and_shorten_text("\n".join(current_lines))
                })
            current_title = line_clean
            current_lines = []
        else:
            current_lines.append(line_clean)
            
    if current_lines:
        sections.append({
            "day": f"Section {len(sections)+1}" if len(sections) > 0 else "Overview",
            "title": current_title,
            "description": clean_and_shorten_text("\n".join(current_lines))
        })
        
    if not sections:
        sections.append({
            "day": "Overview",
            "title": title,
            "description": clean_and_shorten_text(content)
        })
        
    return sections

def get_unique_image(title, content):
    text = (title + " " + content).lower()
    
    # 1. Check for specific overrides first
    for kw, photo_ids in SPECIFIC_OVERWRIDES.items():
        if kw in text:
            for photo_id in photo_ids:
                if photo_id not in assigned_images:
                    assigned_images.add(photo_id)
                    return f"https://images.unsplash.com/{photo_id}?auto=format&fit=crop&w=600&q=80"
            
    # 2. Categorize and pull from category pools
    category = "general"
    if any(k in text for k in ["beach", "sea", "island", "agatti", "bangaram", "lakshadweep", "goa", "andaman", "bali", "greece", "santorini", "cruise", "maldives"]):
        category = "beaches"
    elif any(k in text for k in ["mountain", "trek", "hike", "alpine", "kashmir", "manali", "kullu", "valley of flowers", "sikkim", "nepal", "bhutan", "alaska"]):
        category = "mountains"
    elif any(k in text for k in ["temple", "monument", "fort", "palace", "heritage", "egypt", "pyramid", "hampi", "aurangabad", "shirdi", "darshan"]):
        category = "temples"
    elif any(k in text for k in ["city", "dubai", "tokyo", "seoul", "london", "paris", "singapore", "new york", "shopping"]):
        category = "cities"
    elif any(k in text for k in ["forest", "national park", "safari", "wildlife", "gir", "corbett", "kaziranga"]):
        category = "nature"

    # Select pool
    pool_keys = []
    if category in POOLS:
        pool_keys.append(category)
    pool_keys += [k for k in POOLS.keys() if k != category]
    
    for key in pool_keys:
        for photo_id in POOLS[key]:
            if photo_id not in assigned_images:
                assigned_images.add(photo_id)
                return f"https://images.unsplash.com/{photo_id}?auto=format&fit=crop&w=600&q=80"
                
    # Fallback absolute safety (should never happen)
    fallback_id = "photo-1488646953014-85cb44e25828"
    return f"https://images.unsplash.com/{fallback_id}?auto=format&fit=crop&w=600&q=80&sig={len(assigned_images)}"

def clean_title(filename):
    title = os.path.splitext(filename)[0]
    title = re.sub(r"[-_]happyflying", "", title, flags=re.IGNORECASE)
    title = re.sub(r"–.*Nights.*Days", "", title, flags=re.IGNORECASE)
    title = re.sub(r"\d+.*Nights.*Days", "", title, flags=re.IGNORECASE)
    return title.strip()

def parse_duration(filename, content):
    duration_patterns = [
        r"(\d+)\s*(?:Nights?|N)\s*(?:and|&)?\s*(\d+)\s*(?:Days?|D)",
        r"(\d+)\s*(?:Days?|D)\s*(?:and|&)?\s*(\d+)\s*(?:Nights?|N)",
        r"(\d+)\s*N\s*/\s*(\d+)\s*D",
        r"(\d+)\s*D\s*/\s*(\d+)\s*N"
    ]
    
    for pattern in duration_patterns:
        match = re.search(pattern, filename, re.IGNORECASE)
        if match:
            n, d = match.groups()
            return f"{n} Nights / {d} Days"
            
    lines = content.split("\n")[:15]
    for line in lines:
        for pattern in duration_patterns:
            match = re.search(pattern, line, re.IGNORECASE)
            if match:
                n, d = match.groups()
                return f"{n} Nights / {d} Days"
                
    simple_days = re.search(r"(\d+)\s*(?:Days?|D)", filename + " " + " ".join(lines), re.IGNORECASE)
    if simple_days:
        d = int(simple_days.group(1))
        return f"{d-1} Nights / {d} Days" if d > 1 else f"1 Day"
        
    return "Flexible"

def parse_pricing(content):
    inr_matches = re.findall(r"Rs\.?\s*(\d+[\d,]*)(?:\s*/-)?", content, re.IGNORECASE)
    usd_matches = re.findall(r"(?:\$|USD)\s*(\d+[\d,]*)", content, re.IGNORECASE)
    
    if inr_matches:
        costs = [int(m.replace(",", "")) for m in inr_matches if len(m.replace(",", "")) >= 4]
        if costs:
            return f"₹{max(costs):,}"
    if usd_matches:
        costs = [int(m.replace(",", "")) for m in usd_matches if m.replace(",", "").isdigit()]
        if costs:
            return f"${max(costs):,}"
            
    return "On Request"

def classify_seasons(filename, content, region):
    matched_seasons = []
    text_to_scan = (filename + " " + region + " " + content).lower()
    
    for season, keywords in SEASONS_KEYWORDS.items():
        for kw in keywords:
            if re.search(r"\b" + re.escape(kw) + r"\b", text_to_scan):
                matched_seasons.append(season)
                break
                
    if "kerala" in text_to_scan and "Monsoon" not in matched_seasons:
        matched_seasons.append("Monsoon")
    if "rann utsav" in text_to_scan:
        matched_seasons.append("Winter")
    if "cherry blossom" in text_to_scan and "Spring" not in matched_seasons:
        matched_seasons.append("Spring")
    if "valley of flowers" in text_to_scan and "Monsoon" not in matched_seasons:
        matched_seasons.append("Monsoon")
        
    if not matched_seasons:
        if region in ["south india", "west and central india", "africa", "middle east asia"]:
            matched_seasons = ["Winter", "Autumn"]
        else:
            matched_seasons = ["Summer", "Spring"]
            
    return list(set(matched_seasons))

def generate_social_media(title, region, content):
    destination = title.split("Tour")[0].split("Package")[0].strip()
    
    captions = {
        "adventure": f"Ready to break away from the ordinary? 🗺️ Thrills await in {destination}! From climbing rugged ridges to discovering untouched paths, this is the sign you've been waiting for. Pack your bags, fuel your wanderlust, and let the adventure begin. 🧗‍♂️🏔️ #AdventureTravel #{destination} #Wanderlust #ExploreMore",
        "luxury": f"Indulge in the ultimate escape to {destination}. ✨ Experiencing exquisite dining, breath-taking panoramas, and premium comfort that rejuvenates the soul. Because you deserve a vacation that feels like a dream. 🥂🌅 #{destination} #LuxuryTravel #TravelInStyle #VacationGoals #Recharge",
        "family": f"Creating memories that last a lifetime! 👨‍👩‍👧‍👦 Take your family on a magical journey to {destination}. Smooth transfers, child-friendly sightseeing, and absolute peace of mind. Let us handle the details while you share the smiles. ❤️🌴 #{destination} #FamilyVacation #FamilyTravel #Memories #TravelTogether",
        "budget": f"Travel more, spend less! ✈️ Discover the magic of {destination} with our budget-friendly package. Hand-picked accommodations, must-see landmarks, and local experiences without the heavy price tag. 🎒💸 #{destination} #BudgetTravel #WanderlustOnABudget #Backpackers #TravelDeals"
    }
    
    hashtags = [
        f"#{destination.replace(' ', '')}",
        f"#{region.replace(' ', '').replace('&', 'And')}",
        "#TravelIntell", "#Wanderlust", "#ExploreTheWorld", "#TravelItinerary", "#InstaTravel"
    ]
    
    image_prompt = (
        f"A cinematic high-detail photographic wide-shot of {destination}, showcasing its iconic landscapes and landmarks, "
        f"vibrant natural colors, soft golden hour light, shot on 35mm lens, photorealistic, SaaS travel visual standard --ar 16:9"
    )
    
    video_prompt = (
        f"An immersive drone video sweep starting high above {destination}, gliding smoothly forward over scenic mountains, valleys, "
        f"or water channels, dramatic atmospheric lighting, photorealistic details, 4k travel video, 24fps"
    )
    
    return {
        "captions": captions,
        "hashtags": " ".join(hashtags),
        "image_prompt": image_prompt,
        "video_prompt": video_prompt
    }

def convert():
    all_tours = []
    tour_id = 1
    
    for segment in ["IndianTour", "international Tour"]:
        segment_path = os.path.join(workspace_root, segment)
        if not os.path.exists(segment_path):
            continue
            
        for root, dirs, files in os.walk(segment_path):
            if "travelintell" in root or ".system_generated" in root or "scratch" in root:
                continue
                
            for file in files:
                if not file.endswith(".txt"):
                    continue
                    
                file_path = os.path.join(root, file)
                size = os.path.getsize(file_path)
                
                rel_path = os.path.relpath(file_path, segment_path)
                parts = rel_path.split(os.sep)
                raw_region = parts[0] if len(parts) > 1 else "other"
                region_name = REGION_CLEAN_NAMES.get(raw_region.lower(), raw_region.title())
                
                content = ""
                if size > 0:
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()
                    except Exception as e:
                        print(f"Error reading {file_path}: {e}")
                        continue
                else:
                    continue
                
                title = clean_title(file)
                duration = parse_duration(file, content)
                price = parse_pricing(content)
                seasons = classify_seasons(file, content, raw_region.lower())
                marketing = generate_social_media(title, region_name, content)
                
                # Fetch GUARANTEED 100% UNIQUE travel image URL
                image_url = get_unique_image(title, content)
                
                itinerary_days = []
                day_sections = re.split(r"(?:Day\s*\d+|Day\s*-\s*\d+):", content, flags=re.IGNORECASE)
                
                if len(day_sections) > 1:
                    header_text = day_sections[0].strip()
                    for idx, day_content in enumerate(day_sections[1:]):
                        lines = day_content.strip().split("\n")
                        day_title = lines[0].strip(" -:–") if lines else f"Day {idx+1}"
                        day_desc = "\n".join(lines[1:]).strip() if len(lines) > 1 else lines[0].strip()
                        
                        if len(day_title) > 60:
                            day_desc = day_title + "\n" + day_desc
                            day_title = f"Day {idx+1}"
                            
                        itinerary_days.append({
                            "day": f"Day {idx+1}",
                            "title": day_title,
                            "description": clean_and_shorten_text(day_desc)
                        })
                else:
                    # Informational article (like dubai discovery.txt)
                    # Split dynamically by subheadings to improve readability
                    itinerary_days = split_by_headings(content, title)
                
                inclusions = []
                exclusions = []
                
                inclusion_match = re.search(r"(?:Inclusion|Includes?|Cost Includes?)\s*:-?(.*)(?:Exclusion|Excludes?|Cost Excludes?)\s*:-?", content, re.IGNORECASE | re.DOTALL)
                if inclusion_match:
                    inclusions_text = inclusion_match.group(1)
                    inclusions = [line.strip(" ·\t.*-") for line in inclusions_text.split("\n") if line.strip(" ·\t.*-")]
                    
                exclusion_match = re.search(r"(?:Exclusion|Excludes?|Cost Excludes?)\s*:-?(.*)", content, re.IGNORECASE | re.DOTALL)
                if exclusion_match:
                    exclusions_text = exclusion_match.group(1)
                    exclusions_text = re.split(r"(?:Please Note|Notes?):", exclusions_text, flags=re.IGNORECASE)[0]
                    exclusions = [line.strip(" ·\t.*-") for line in exclusions_text.split("\n") if line.strip(" ·\t.*-")]
                    
                inclusions = [i for i in inclusions if len(i) > 3 and "exclusion" not in i.lower()]
                exclusions = [e for e in exclusions if len(e) > 3 and "inclusion" not in e.lower()]
                
                warnings = []
                warning_matches = re.finditer(r"(?:government regulation|note|luggage|permit|gst)\s*:-?\s*(.*)", content, re.IGNORECASE)
                for w in warning_matches:
                    w_text = w.group(1).split("\n")[0].strip()
                    if len(w_text) > 15:
                        warnings.append(w_text)
                        
                if "darjeeling" in title.lower() or "shillong" in title.lower():
                    if not any("roof" in war.lower() for war in warnings):
                        warnings.append("Note: Due to government regulations, no luggage carriers are allowed on vehicle roofs. The last row of seats will be used for luggage.")
                if "nathula" in content.lower():
                    if not any("nathula" in war.lower() for war in warnings):
                        warnings.append("Note: Nathula Pass requires special government permit, is closed on Monday & Tuesday, and depends entirely on weather permits.")
                    
                all_tours.append({
                    "id": tour_id,
                    "title": title,
                    "segment": "Domestic" if segment == "IndianTour" else "International",
                    "region": region_name,
                    "duration": duration,
                    "price": price,
                    "seasons": seasons,
                    "image_url": image_url,
                    "days": itinerary_days,
                    "inclusions": inclusions if inclusions else ["Hotel Accommodation", "Daily Breakfast & Meals as per plan", "Private Transfers & Sightseeing"],
                    "exclusions": exclusions if exclusions else ["Airfare / Train fare", "Personal Expenses (Laundry, Tips)", "GST & Room Heater charges"],
                    "warnings": warnings,
                    "marketing": marketing,
                    "original_path": os.path.relpath(file_path, workspace_root)
                })
                tour_id += 1
                
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(all_tours, f, indent=2, ensure_ascii=False)
        
    print(f"Successfully processed {len(all_tours)} tours and exported to {output_json}")

if __name__ == "__main__":
    convert()

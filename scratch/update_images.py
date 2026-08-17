import json
import os
from pathlib import Path

# Paths
base_dir = r"C:\Users\hp\Desktop\flydata\travelintell"
db_path = os.path.join(base_dir, "tours_db.json")
images_dir = os.path.join(base_dir, "assets", "images")

# Load existing DB
with open(db_path, "r", encoding="utf-8") as f:
    tours = json.load(f)

# Get list of images
image_files = os.listdir(images_dir)
image_map = {Path(img).stem.lower().strip(): img for img in image_files}

updated_count = 0

for tour in tours:
    orig_path = tour.get("original_path", "")
    if orig_path:
        # Extract filename without extension
        stem = Path(orig_path).stem.lower().strip()
        
        # Look for matching image
        if stem in image_map:
            tour["image_url"] = f"/assets/images/{image_map[stem]}"
            updated_count += 1
            print(f"Updated {tour['title']} -> {image_map[stem]}")
        else:
            # Maybe some names have extra whitespace or different cases
            print(f"Warning: No image found for stem: '{stem}' (Tour: {tour['title']})")

# Save updated DB
with open(db_path, "w", encoding="utf-8") as f:
    json.dump(tours, f, indent=2, ensure_ascii=False)

print(f"\nDone. Updated {updated_count} tours.")

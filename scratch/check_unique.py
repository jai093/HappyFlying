import json

with open("c:/Users/hp/Desktop/flydata/travelintell/tours_db.json", "r", encoding="utf-8") as f:
    data = json.load(f)

urls = [t["image_url"] for t in data]
duplicates = set([x for x in urls if urls.count(x) > 1])

print(f"Total packages: {len(data)}")
print(f"Total unique image URLs: {len(set(urls))}")
print(f"Duplicate URLs count: {len(duplicates)}")

# Print some tours with their images
for t in data[:10]:
    print(f"ID {t['id']}: {t['title']} -> {t['image_url']}")

print("\nChecking Dubai & Korea tours:")
for t in data:
    if "dubai" in t["title"].lower() or "korea" in t["title"].lower() or "kashmir" in t["title"].lower():
        print(f"ID {t['id']}: {t['title']} -> {t['image_url']}")

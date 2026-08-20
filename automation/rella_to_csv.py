"""Turn a Rella content-performance pull into a CSV the report can import.

Rella is used to fill what the native connectors cannot reach: LinkedIn, which has no CNO app yet,
and TikTok, whose Display API returns three account numbers and nothing else. Meta is left to the
native connector, which returns a real daily series Rella does not carry.

Usage:
    python automation/rella_to_csv.py <rella.json> "<Client name>" <output.csv>

The input is whatever `get_rella_social_content_performance` returned, saved verbatim: either the
whole envelope or just the items array. Paginate first and concatenate the items; this script does
not call Rella itself, so nothing here needs a token.

Never commit the input or the output. Both are client data.
"""

import csv
import json
import sys

# One column per thing Rella actually reports, named as the report's importer expects.
COLUMNS = [
    "record_type", "data_source", "aggregation", "client", "platform", "date",
    "post_type", "caption_length", "hashtag_count",
    "reach", "views", "engagement", "likes", "comments", "shares", "follows",
    "average_view_duration_seconds",
]


def rows_from(payload):
    """Accept the full envelope, the data object, or a bare list of items."""
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for path in (("data", "items"), ("items",)):
            node = payload
            for key in path:
                node = node.get(key) if isinstance(node, dict) else None
            if isinstance(node, list):
                return node
    raise SystemExit("Could not find an items array in that JSON.")


def convert(items, client):
    out = []
    for item in items:
        metrics = item.get("metrics") or {}
        row = {c: "" for c in COLUMNS}
        row.update({
            "record_type": "post",
            "data_source": "rella",
            "aggregation": "post",
            "client": client,
            "platform": str(item.get("platform") or "").lower(),
            # Keep the whole timestamp. Two posts on one day are two posts, and truncating to the
            # date makes them collide and silently become one during import.
            "date": str(item.get("date") or "").replace("Z", "").split(".")[0],
            "post_type": item.get("postType") or "",
        })
        for source, target in (("captionLength", "caption_length"), ("hashtagCount", "hashtag_count")):
            if item.get(source) is not None:
                row[target] = item[source]
        for source, target in (
            ("reach", "reach"),
            # Rella reports one combined figure per post. Meta has retired impressions for
            # Instagram in favour of views, and TikTok and YouTube only ever counted views, so
            # views is the column that means the same thing on every platform here.
            ("viewsOrImpressions", "views"),
            ("engagement", "engagement"),
            ("likes", "likes"),
            ("comments", "comments"),
            ("shares", "shares"),
            ("follows", "follows"),
            ("averageWatchTime", "average_view_duration_seconds"),
        ):
            if metrics.get(source) is not None:
                row[target] = metrics[source]
        out.append(row)
    return out


def main():
    if len(sys.argv) != 4:
        raise SystemExit(__doc__.strip())
    source, client, target = sys.argv[1], sys.argv[2], sys.argv[3]
    with open(source, encoding="utf-8") as handle:
        items = rows_from(json.load(handle))
    rows = convert(items, client)
    if not rows:
        raise SystemExit("That pull contained no posts, so there is nothing to import.")
    with open(target, "w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)

    by_platform = {}
    for row in rows:
        by_platform[row["platform"]] = by_platform.get(row["platform"], 0) + 1
    print(f"Wrote {len(rows)} posts to {target}")
    for platform, count in sorted(by_platform.items()):
        print(f"  {platform}: {count}")
    print("\nImport this in the report, and do not import a native pull for the same platform in")
    print("the same report: the two sources do not deduplicate against each other and every post")
    print("would be counted twice.")


if __name__ == "__main__":
    main()

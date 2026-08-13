"""Month-close step one: refresh every client's closed month and report what is ready.

Run by .github/workflows/month-close.yml on the first of each month, and by hand with the
workflow's "Run workflow" button.

This script deliberately never prints a client's name. It runs in GitHub Actions, and this
repository is public, so its logs are public: naming a client there would publish who CNO works
for. Counts and readiness are enough to know whether the month can be built, and the names are a
click away in the connection console for whoever is entitled to see them.

Standard library only, so the workflow needs no install step and cannot break on a dependency.
"""

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, timedelta
from http.cookiejar import CookieJar

TIMEOUT = 120  # A free Render service sleeps; the first call has to wake it before it answers.


def closed_month(today):
    """The month that has just ended: the reporting period a first-of-month run is for.

    Returned as (first_day, last_day) strings. Running on 1 March gives all of February, and the
    end date is the last day of that month rather than today, so a report never contains a
    partial day that would read as a collapse in performance.
    """
    last_day = today.replace(day=1) - timedelta(days=1)
    return last_day.replace(day=1).isoformat(), last_day.isoformat()


class Service:
    """A signed-in session against the CNO sync service."""

    def __init__(self, base, token):
        self.base = base.rstrip("/")
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(CookieJar())
        )
        self._sign_in(token)

    def _open(self, path, data=None, content_type=None):
        request = urllib.request.Request(self.base + path, data=data, method="POST" if data else "GET")
        if content_type:
            request.add_header("Content-Type", content_type)
        with self.opener.open(request, timeout=TIMEOUT) as response:
            body = response.read().decode("utf-8", "replace")
        return body

    def _sign_in(self, token):
        form = urllib.parse.urlencode({"token": token}).encode()
        self._open("/admin/login", form, "application/x-www-form-urlencoded")
        # The service answers an unauthenticated /v1/ call with 401, so a working call proves the
        # session cookie landed. A wrong token otherwise fails much later and blames the wrong step.
        try:
            self.json("/v1/connections")
        except urllib.error.HTTPError as error:
            if error.code == 401:
                raise SystemExit(
                    "Sign-in failed. CNO_ADMIN_TOKEN does not match the service's "
                    "CNO_ADMIN_TOKEN. Copy it from the service's environment settings."
                )
            raise

    def json(self, path, payload=None):
        body = self._open(
            path,
            json.dumps(payload).encode() if payload is not None else None,
            "application/json" if payload is not None else None,
        )
        return json.loads(body)


def health(base):
    with urllib.request.urlopen(base.rstrip("/") + "/health", timeout=TIMEOUT) as response:
        return json.loads(response.read().decode("utf-8", "replace"))


def main():
    base = os.environ.get("CNO_SYNC_SERVICE_URL", "").strip()
    token = os.environ.get("CNO_ADMIN_TOKEN", "").strip()
    if not base or not token:
        print("Native sync is not configured. Set CNO_SYNC_SERVICE_URL and CNO_ADMIN_TOKEN.")
        return 0  # Not a failure: an unconfigured repository should stay quiet, not go red.

    state = health(base)
    print(f"Service {state.get('version')} · storage {state.get('storage')}")
    if not state.get("durable"):
        # File storage loses connections and report links on every redeploy. Building a month on
        # top of it produces links that die within hours, which reads to a client as an expiry.
        print("FAIL: the service has no database, so nothing it stores would survive.")
        return 1

    start, end = closed_month(date.today())
    print(f"Closed month: {start} to {end}")

    service = Service(base, token)
    clients = service.json("/v1/connections").get("connections", [])
    by_client = {}
    for connection in clients:
        by_client.setdefault(connection.get("client_ref", ""), []).append(connection)

    ready_clients, blocked, failures = 0, 0, 0
    for index, (client_ref, connections) in enumerate(sorted(by_client.items()), start=1):
        assigned = [c for c in connections if c.get("state") == "ready"]
        if not assigned:
            # A connection exists but no native account is assigned to it, so a sync would either
            # return nothing or, worse, return another account's figures.
            blocked += 1
            print(f"Client {index}: no platform is ready — needs an account assignment")
            continue

        result = service.json("/v1/sync", {"client_ref": client_ref, "from": start, "to": end})
        bad = [r for r in result.get("results", []) if not r.get("ok")]
        rows = service.json(f"/v1/rows?client_ref={urllib.parse.quote(client_ref)}")
        count = len(rows.get("rows", []))
        if bad:
            failures += 1
            print(f"Client {index}: {len(bad)} of {len(result.get('results', []))} platforms failed to sync")
        else:
            ready_clients += 1
            print(f"Client {index}: {len(assigned)} platform(s) synced, {count} rows stored")

    summary = (
        f"{len(by_client)} client workspace(s) · {ready_clients} refreshed · "
        f"{blocked} awaiting account assignment · {failures} with sync errors"
    )
    print(summary)
    step_summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if step_summary:
        with open(step_summary, "a", encoding="utf-8") as handle:
            handle.write(f"### CNO month close · {start} to {end}\n\n{summary}\n\n")
            handle.write("Open the connection console for per-client detail. It is not printed here because this repository's build logs are public.\n")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())

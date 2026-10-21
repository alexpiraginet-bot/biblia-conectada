"""Run the actual voice/text Lua transactions with a serialized in-memory Redis harness.

No service credentials or provider calls. This checks script logic, not Upstash durability.
Pass the external directory containing a compatible lupa installation as argv[1].
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import re
import runpy

base = runpy.run_path(str(Path(__file__).with_name("test-assistant-ledger.py")))
Redis, LEDGER = base["Redis"], base["LEDGER"]
source = (Path(__file__).resolve().parents[1] / "src/lib/assistant/voice-ledger.ts").read_text(encoding="utf-8")
base["SCRIPTS"]["RESERVE_VOICE_LUA"] = re.search(r"export const RESERVE_VOICE_LUA = `([\s\S]*?)`;", source).group(1)


def voice(db, request, amount=85_000, user=None, month="2026-10", day="21", minute=1):
    user = user or request
    return db.run("RESERVE_VOICE_LUA", [
        LEDGER, f"voice:{request}", f"voice-minute:{user}:{minute}", f"voice-day:{user}:{month}-{day}",
    ], [20_000_000, amount, f"spent:{month}", f"voiceSpent:{month}", 5_000_000, "fingerprint"])


def voice_spent(db, month="2026-10"):
    return int(db.data[LEDGER].get(f"voiceSpent:{month}", "0"))


def check_voice_cap_concurrent():
    db = Redis()
    with ThreadPoolExecutor(max_workers=16) as pool:
        results = list(pool.map(lambda n: voice(db, str(n)), range(100)))
    assert sum(r[0] == "reserved" for r in results) == 58
    assert voice_spent(db) == db.spent() == 4_930_000


def check_shared_total_and_settlement():
    db = Redis()
    assert db.reserve("study", 19_500_000)[0] == "reserved"
    assert voice(db, "audio", 500_000)[0] == "reserved"
    assert db.spent() == 20_000_000 and voice_spent(db) == 500_000
    assert voice(db, "over", 1) == ["budget"]
    assert db.reserve("other-study", 1) == ["budget"]
    assert db.settle("study", 19_000_000) == ["settled"]
    assert voice_spent(db) == 500_000 and db.spent() == 19_500_000
    assert voice(db, "later", 500_000)[0] == "reserved"
    assert db.spent() == 20_000_000 and voice_spent(db) == 1_000_000


def check_concurrent_duplicate_and_uncertain_delivery():
    db = Redis()
    with ThreadPoolExecutor(max_workers=12) as pool:
        results = list(pool.map(lambda _: voice(db, "same"), range(60)))
    assert sum(r[0] == "reserved" for r in results) == 1
    assert sum(r[0] == "duplicate" for r in results) == 59
    assert db.spent() == voice_spent(db) == 85_000
    # Timeout and client disconnect deliberately have no release transaction.
    assert voice(db, "same") == ["duplicate"]
    assert db.spent() == 85_000


def check_rates_and_month_boundary():
    db = Redis()
    for n in range(2):
        assert voice(db, f"m{n}", user="one")[0] == "reserved"
    assert voice(db, "m2", user="one") == ["rate"]
    for n in range(2, 12):
        assert voice(db, f"d{n}", user="one", minute=n)[0] == "reserved"
    assert voice(db, "d12", user="one", minute=20) == ["rate"]
    assert voice(db, "new-month", user="one", month="2026-11", day="01", minute=30)[0] == "reserved"
    assert voice_spent(db) == 12 * 85_000 and voice_spent(db, "2026-11") == 85_000


def check_fail_closed_voice_state():
    assert voice(Redis(seeded=False), "missing") == ["unavailable"]
    for field, value in [("voiceSpent:2026-10", "broken"), ("voiceSpent:2026-10", "-1"),
                         ("voiceSpent:2026-10", "1"), ("spent:2026-10", "bad"),
                         ("blocked", "1"), ("limitMicros", "25000000")]:
        db = Redis()
        db.data[LEDGER][field] = value
        before = dict(db.data[LEDGER])
        assert voice(db, field) == ["unavailable"]
        assert db.data[LEDGER] == before


def check_voice_and_text_concurrent():
    db = Redis()
    def task(n):
        return voice(db, str(n), 250_000) if n % 2 == 0 else db.reserve(f"text:{n}", 1_000_000)
    with ThreadPoolExecutor(max_workers=16) as pool:
        results = list(pool.map(task, range(100)))
    assert db.spent() <= 20_000_000 and voice_spent(db) <= 5_000_000
    accepted = sum((250_000 if n % 2 == 0 else 1_000_000) for n, result in enumerate(results) if result[0] == "reserved")
    assert db.spent() == accepted


tests = [check_voice_cap_concurrent, check_shared_total_and_settlement,
         check_concurrent_duplicate_and_uncertain_delivery, check_rates_and_month_boundary,
         check_fail_closed_voice_state, check_voice_and_text_concurrent]
for test in tests:
    test()
    print(f"PASS {test.__name__}")
print(f"{len(tests)} production-Lua voice scenarios passed; no external services contacted.")

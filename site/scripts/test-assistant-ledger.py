"""Execute the production Lua scripts locally (lupa/Lua), with a small Redis command harness.

No network, keys or provider calls. Install lupa outside the repository, then run with
that directory on sys.path. Redis serializes EVAL; this harness supplies that serialization
and tests script behavior, not the external Upstash service or its durability.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import Lock
import re
import sys

if len(sys.argv) > 1:
    sys.path.insert(0, sys.argv[1])
from lupa.lua51 import LuaRuntime

SOURCE = (Path(__file__).resolve().parents[1] / "src/lib/assistant/ledger.ts").read_text(encoding="utf-8")
SCRIPTS = {
    name: re.search(rf"export const {name} = `([\s\S]*?)`;", SOURCE).group(1)
    for name in ["RESERVE_LUA", "SETTLE_LUA"]
}
LIMIT = 20_000_000
LEDGER = "bc:{assistant}:ledger"


class Redis:
    def __init__(self, seeded=True):
        self.data = {}
        self.lock = Lock()
        self.fail_once = None
        if seeded:
            self.data[LEDGER] = {"schema": "1", "limitMicros": str(LIMIT), "blocked": "0"}

    def call(self, command, key, *args):
        if self.fail_once == command:
            self.fail_once = None
            raise RuntimeError("simulated Redis command failure")
        if command == "HGET":
            return self.data.get(key, {}).get(args[0], False)
        if command == "HSET":
            record = self.data.setdefault(key, {})
            for i in range(0, len(args), 2):
                record[args[i]] = str(args[i + 1])
            return 1
        if command == "HINCRBY":
            record = self.data.setdefault(key, {})
            record[args[0]] = str(int(record.get(args[0], "0")) + int(args[1]))
            return int(record[args[0]])
        if command == "GET":
            return self.data.get(key, False)
        if command == "INCR":
            self.data[key] = str(int(self.data.get(key, "0")) + 1)
            return int(self.data[key])
        if command == "EXISTS":
            return int(key in self.data)
        if command == "EXPIRE":
            return 1  # Expiration is not exercised; the accounting hash never expires.
        raise AssertionError(command)

    def run(self, script, keys, args):
        with self.lock:
            lua = LuaRuntime(unpack_returned_tuples=True)
            lua.globals().redis = lua.table_from({"call": self.call})
            lua.globals().KEYS = lua.table_from(keys)
            lua.globals().ARGV = lua.table_from([str(arg) for arg in args])
            result = lua.execute(SCRIPTS[script])
            return list(result.values())

    def reserve(self, request, amount, user=None, month="2026-10", minute=1, day="20"):
        user = user or request
        return self.run("RESERVE_LUA", [
            LEDGER, request, f"minute:{user}:{minute}", f"day:{user}:{day}",
        ], [LIMIT, amount, f"spent:{month}", "fingerprint", "unused", 4, 12])

    def settle(self, request, actual, fingerprint="fingerprint"):
        return self.run("SETTLE_LUA", [LEDGER, request], [fingerprint, actual])

    def spent(self, month="2026-10"):
        return int(self.data[LEDGER].get(f"spent:{month}", "0"))


def check_concurrency():
    db = Redis()
    with ThreadPoolExecutor(max_workers=12) as pool:
        results = list(pool.map(lambda n: db.reserve(f"request-{n}", 1_100_000), range(100)))
    assert sum(result[0] == "reserved" for result in results) == 18
    assert db.spent() == 19_800_000 <= LIMIT
    assert sum(result[0] == "budget" for result in results) == 82


def check_idempotency():
    db = Redis()
    assert db.reserve("same", 1_000_000)[0] == "reserved"
    for _ in range(10):
        assert db.reserve("same", 1_000_000)[0] == "duplicate"
    assert db.spent() == 1_000_000
    assert db.settle("same", 60_000) == ["settled"]
    assert db.spent() == 60_000
    for _ in range(10):
        assert db.settle("same", 0) == ["unchanged"]
    assert db.spent() == 60_000


def check_fail_closed():
    missing = Redis(seeded=False)
    assert missing.reserve("r", 100) == ["unavailable"]
    db = Redis()
    db.data[LEDGER]["limitMicros"] = "999999999"
    assert db.reserve("r", 100) == ["unavailable"]
    db.data[LEDGER]["limitMicros"] = str(LIMIT)
    db.data[LEDGER]["spent:2026-10"] = "corrupt"
    assert db.reserve("r", 100) == ["unavailable"]
    db.data[LEDGER]["spent:2026-10"] = "0"
    db.reserve("r", 1000)
    assert db.settle("r", 0, fingerprint="wrong") == ["unavailable"]
    assert db.spent() == 1000
    assert db.settle("r", -1) == ["unavailable"]
    assert db.spent() == 1000


def check_uncertain_and_overrun():
    db = Redis()
    db.reserve("network-timeout", 1_000_000)
    # There is deliberately no release/cancel path after uncertain delivery.
    assert db.spent() == 1_000_000
    db.reserve("overrun", 1000)
    assert db.settle("overrun", 1200) == ["blocked"]
    assert db.spent() == 1_001_200
    assert db.data[LEDGER]["blocked"] == "1"
    assert db.reserve("later", 1) == ["unavailable"]
    assert db.settle("overrun", 0) == ["unchanged"]


def check_partial_settlement():
    db = Redis()
    db.reserve("r", 1000)
    db.fail_once = "HINCRBY"  # Failure after state=settled must not permit another refund.
    try:
        db.settle("r", 100)
        raise AssertionError("failure injection was not reached")
    except RuntimeError:
        pass
    assert db.spent() == 1000
    assert db.settle("r", 0) == ["unchanged"]
    assert db.spent() == 1000


def check_months_and_rates():
    db = Redis()
    for i in range(4):
        assert db.reserve(f"m{i}", 100, user="one") == ["reserved", "100"]
    assert db.reserve("m4", 100, user="one") == ["minute"]
    for i in range(4, 12):
        assert db.reserve(f"d{i}", 100, user="one", minute=i)[0] == "reserved"
    assert db.reserve("d12", 100, user="one", minute=20) == ["day"]
    assert db.spent() == 1200
    assert db.reserve("new-month", 200, month="2026-11")[0] == "reserved"
    assert db.settle("m0", 20) == ["settled"]
    assert db.spent() == 1120
    assert db.spent("2026-11") == 200


for test in [
    check_concurrency, check_idempotency, check_fail_closed,
    check_uncertain_and_overrun, check_partial_settlement, check_months_and_rates,
]:
    test()
    print(f"PASS {test.__name__}")
print("6 production-Lua accounting scenarios passed; no external services contacted.")

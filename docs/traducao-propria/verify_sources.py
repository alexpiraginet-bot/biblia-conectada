"""Read-only audit of licensed local VPL corpora and the editorial pilot."""

import hashlib
import json
from pathlib import Path
import re
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
SOURCES = (
    ("blivre", "fontes/blivre/porbr2018_vpl.zip", "CC-BY (see source notice)"),
    ("open-nbv", "fontes/ebible/poronbv/poronbv_vpl.zip", "CC-BY-SA-4.0"),
    ("portuguese-world-bible", "fontes/ebible/porbrbsl/porbrbsl_vpl.zip", "Public domain; draft"),
    ("free-bible-for-all-nt", "fontes/ebible/porblt/porblt_vpl.zip", "CC-BY-SA-4.0"),
    ("translation-for-translators-nt", "fontes/ebible/portft/portft_vpl.zip", "CC-BY-SA-4.0"),
    ("wlc", "fontes/ebible/hebwlc/hebwlc_vpl.zip", "Public domain"),
    ("sblgnt", "fontes/ebible/grcsbl/grcsbl_vpl.zip", "CC-BY-4.0"),
)


def require(condition, message):
    if not condition:
        raise ValueError(message)


def inspect_source(identifier, relative_path, license_label, expected_hashes):
    path = ROOT / relative_path
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    expected = expected_hashes.get(relative_path)
    require(expected is not None, f"No registered SHA-256: {relative_path}")
    require(digest == expected, f"SHA-256 mismatch: {relative_path}")
    with zipfile.ZipFile(path) as archive:
        entries = [name for name in archive.namelist() if name.endswith("_vpl.txt")]
        require(len(entries) == 1, f"Expected one VPL text: {relative_path}")
        rows = archive.read(entries[0]).decode("utf-8-sig").splitlines()
    verses = {}
    for line_number, row in enumerate(rows, 1):
        if not row.strip():
            continue
        match = re.fullmatch(r"([A-Z0-9]{3}) (\d+):(\d+)(?:[ \t]+(.*))?", row)
        require(match is not None, f"Unparsed row {line_number}: {relative_path}")
        book, chapter, verse, text = match.groups()
        key = f"{book} {chapter}:{verse}"
        require(key not in verses, f"Duplicate reference {key}: {relative_path}")
        verses[key] = text or ""
    report = {
        "id": identifier,
        "path": relative_path,
        "sha256": digest,
        "matchesRegisteredHash": True,
        "licenseLabel": license_label,
        "bookCount": len({key.split()[0] for key in verses}),
        "chapterCount": len({key.split(":")[0] for key in verses}),
        "verseRowCount": len(verses),
        "emptyTextCount": sum(not text.strip() for text in verses.values()),
    }
    return report, verses


def audit():
    registered = {}
    for row in (ROOT / "fontes/SHA256SUMS").read_text(encoding="utf-8-sig").splitlines():
        match = re.fullmatch(r"([a-fA-F0-9]{64})\s+\*?(.+)", row)
        if match:
            digest, path = match.groups()
            path = path.replace("\\", "/").removeprefix("./")
            registered[path if path.startswith("fontes/") else f"fontes/{path}"] = digest.lower()
    reports, corpora = [], {}
    for source in SOURCES:
        report, verses = inspect_source(*source, registered)
        reports.append(report)
        corpora[source[0]] = verses

    baseline = set(corpora["blivre"])
    open_nbv = set(corpora["open-nbv"])
    pilot = json.loads((HERE / "piloto-joao-1.json").read_text(encoding="utf-8"))
    require(pilot["status"] == "draft", "Pilot must remain an editorial draft")
    require(pilot["approvedForProduction"] is False, "Pilot must not be approved for production")
    require(pilot["humanReview"] is None, "Do not imply a completed human review")
    require(pilot["assistedByAI"] is True, "AI assistance must remain explicit")
    greek_report = next(item for item in reports if item["id"] == "sblgnt")
    require(pilot["source"]["sha256"] == greek_report["sha256"], "Pilot source hash differs")
    require(pilot["source"]["path"] == greek_report["path"], "Pilot source path differs")
    require(pilot["source"]["entry"] == "grcsbl_vpl.txt", "Pilot source entry differs")
    source_refs = []
    for verse in pilot["sourceVerses"]:
        reference = verse["reference"]
        require(corpora["sblgnt"].get(reference) == verse["text"], f"Greek source differs: {reference}")
        source_refs.append(reference)
    require(source_refs == [f"JOH 1:{verse}" for verse in range(1, 6)], "Expected John 1:1-5 exactly once, in order")
    unit_refs = [ref for unit in pilot["units"] for ref in unit["references"]]
    require(source_refs == unit_refs, "Pilot units must cover the source verses exactly once, in order")
    markdown = (HERE / "piloto-joao-1.md").read_text(encoding="utf-8")
    expected_lines = []
    for unit in pilot["units"]:
        require(unit["references"] and unit["text"].strip(), "Pilot units must not be empty")
        numbers = [ref.split(":")[1] for ref in unit["references"]]
        label = numbers[0] if len(numbers) == 1 else f"{numbers[0]}–{numbers[-1]}"
        expected_lines.append((label, unit["text"]))
    actual_lines = re.findall(r"^\*\*([\d–]+)\*\* (.+)$", markdown, flags=re.MULTILINE)
    require(actual_lines == expected_lines, "Pilot Markdown labels, order or text differ from structured units")
    return {
        "schemaVersion": 1,
        "scope": "Local file integrity and VPL structure; not a translation-quality assessment",
        "sources": reports,
        "openNbvAgainstBlivre": {
            "additionalReferences": sorted(open_nbv - baseline),
            "missingReferences": sorted(baseline - open_nbv),
            "warning": "Reference presence does not prove equivalent text or semantic alignment",
        },
        "pilot": {"sourceLinesMatch": True, "unitsCoverSource": True, "markdownMatches": True, "approvedForProduction": False},
    }


if __name__ == "__main__":
    try:
        result = audit()
        if sys.argv[1:] == ["--report"]:
            print(json.dumps(result, ensure_ascii=False, indent=2))
        else:
            require(not sys.argv[1:], "Usage: verify_sources.py [--report]")
            saved = json.loads((HERE / "source-audit.json").read_text(encoding="utf-8-sig"))
            require(result == saved, "Saved source audit differs; inspect before replacing it")
            print("PASS: 7 corpus hashes, VPL structure, Greek pilot source, draft status and saved report")
    except (ValueError, OSError, KeyError, zipfile.BadZipFile) as error:
        print(f"FAIL: {error}", file=sys.stderr)
        sys.exit(1)

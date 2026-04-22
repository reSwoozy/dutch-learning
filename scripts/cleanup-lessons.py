#!/usr/bin/env python3
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LESSONS_DIR = ROOT / "site" / "data" / "lessons"
TESTS_DIR = ROOT / "site" / "data" / "tests"
GRAMMAR_DIR = ROOT / "site" / "data" / "grammar"

ONLY_META_LINE_RE = re.compile(
    r"^\s*(?:\*\*)?(?:Уровень|Время|Время изучения|День|Тема)(?:\*\*)?\s*:",
    re.I,
)
SELF_CHECK_RE = re.compile(r"Самопроверка", re.I)
DASH_LINE_RE = re.compile(r"^-{3,}\s*$")


def is_only_metadata(text: str) -> bool:
    lines = [l.strip() for l in text.replace("\r\n", "\n").split("\n") if l.strip()]
    if not lines:
        return False
    return all(ONLY_META_LINE_RE.match(l) for l in lines)


def clean_content(text: str) -> str:
    if not isinstance(text, str):
        return text
    lines = text.replace("\r\n", "\n").split("\n")
    cleaned = []
    for l in lines:
        s = l.strip()
        if DASH_LINE_RE.match(s):
            continue
        if ONLY_META_LINE_RE.match(s):
            continue
        cleaned.append(l)
    result = "\n".join(cleaned)
    result = re.sub(r"\n{3,}", "\n\n", result).strip()
    return result


def clean_section(sec: dict) -> dict | None:
    title = sec.get("title", "") or ""
    content = sec.get("content", "") or ""
    if isinstance(content, str) and is_only_metadata(content):
        return None
    if SELF_CHECK_RE.search(title):
        return None
    if "content" in sec and isinstance(sec["content"], str):
        sec["content"] = clean_content(sec["content"])
    return sec


def process_lesson(path: Path) -> bool:
    with path.open("r", encoding="utf-8") as f:
        original_text = f.read()
    data = json.loads(original_text)
    sections = data.get("sections")
    if not isinstance(sections, list):
        return False
    new_sections = []
    for sec in sections:
        kept = clean_section(sec)
        if kept is not None:
            new_sections.append(kept)
    data["sections"] = new_sections
    new_text = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    if new_text != original_text:
        with path.open("w", encoding="utf-8") as f:
            f.write(new_text)
        return True
    return False


def process_test(path: Path) -> bool:
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    changed = False
    for sec in data.get("sections", []) or []:
        tasks = sec.get("speakingTask")
        if isinstance(tasks, list):
            for task in tasks:
                items = task.get("items")
                if isinstance(items, list):
                    filtered = [i for i in items if not (isinstance(i, str) and DASH_LINE_RE.match(i.strip()))]
                    if filtered != items:
                        task["items"] = filtered
                        changed = True
    if changed:
        with path.open("w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")
    return changed


def process_grammar(path: Path) -> bool:
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    changed = False
    for ex in data.get("exercises", []) or []:
        opts = ex.get("options")
        if isinstance(opts, list):
            filtered = [o for o in opts if not (isinstance(o, str) and DASH_LINE_RE.match(o.strip()))]
            if filtered != opts:
                ex["options"] = filtered
                changed = True
    if changed:
        with path.open("w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")
    return changed


def main():
    lesson_changed = 0
    for p in sorted(LESSONS_DIR.glob("*.json")):
        if p.name == "index.json":
            continue
        if process_lesson(p):
            lesson_changed += 1
            print(f"lesson updated: {p.name}")
    print(f"lessons changed: {lesson_changed}")

    test_changed = 0
    for p in sorted(TESTS_DIR.glob("*.json")):
        if p.name == "index.json":
            continue
        if process_test(p):
            test_changed += 1
            print(f"test updated: {p.name}")
    print(f"tests changed: {test_changed}")

    grammar_changed = 0
    for p in sorted(GRAMMAR_DIR.glob("*.json")):
        if p.name == "index.json":
            continue
        if process_grammar(p):
            grammar_changed += 1
            print(f"grammar updated: {p.name}")
    print(f"grammar changed: {grammar_changed}")


if __name__ == "__main__":
    main()

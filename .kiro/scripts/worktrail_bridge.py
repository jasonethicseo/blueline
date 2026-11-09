"""Bridge Kiro command hooks to the Worktrail (casebook) client hook.

Usage (from .kiro/hooks/*.json, run in the project root):
    python .kiro/scripts/worktrail_bridge.py session-start
    python .kiro/scripts/worktrail_bridge.py prompt
    python .kiro/scripts/worktrail_bridge.py post-commit
    python .kiro/scripts/worktrail_bridge.py post-compact
    python .kiro/scripts/worktrail_bridge.py checkpoint pre-compact

The casebook hook prints Claude Code hook JSON. Kiro adds a hook's stdout to the
agent context as plain text, so this bridge prints only the text parts
(additionalContext, systemMessage). It also fills `prompt` from USER_PROMPT and
`cwd` from the working directory when Kiro's stdin lacks them.

If Worktrail is not installed (for example on someone else's clone), it prints
nothing and exits 0, so it never blocks the agent.
"""
from __future__ import annotations

import json
import os
import pathlib
import subprocess
import sys

CLIENT = pathlib.Path(os.environ.get("CASEBOOK_CLIENT", "~/.casebook/client")).expanduser()
HOOK = CLIENT / "tools" / "hooks" / "casebook_hook.py"
PYTHON = CLIENT / ".venv" / "bin" / "python"
TIMEOUTS = {"prompt": 5, "post-commit": 15}


def main() -> None:
    args = sys.argv[1:]
    if not args or not HOOK.is_file() or not PYTHON.is_file():
        return
    try:
        raw = sys.stdin.read()
        payload = json.loads(raw) if raw.strip() else {}
        if not isinstance(payload, dict):
            payload = {}
    except Exception:  # noqa: BLE001
        payload = {}
    payload.setdefault("cwd", os.getcwd())
    if args[0] == "prompt" and not payload.get("prompt"):
        payload["prompt"] = os.environ.get("USER_PROMPT", "")
    try:
        done = subprocess.run(
            [str(PYTHON), str(HOOK), *args],
            input=json.dumps(payload, ensure_ascii=False),
            capture_output=True, text=True, timeout=TIMEOUTS.get(args[0], 15),
        )
        out = json.loads(done.stdout) if done.stdout.strip() else {}
    except Exception:  # noqa: BLE001
        return
    parts = []
    spec = out.get("hookSpecificOutput") if isinstance(out, dict) else None
    if isinstance(spec, dict) and isinstance(spec.get("additionalContext"), str):
        parts.append(spec["additionalContext"])
    if isinstance(out, dict) and isinstance(out.get("systemMessage"), str):
        parts.append(out["systemMessage"])
    if parts:
        print("\n\n".join(parts))


if __name__ == "__main__":
    main()

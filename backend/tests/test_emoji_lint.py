"""
CI Lint Test: Ensures ZERO emojis exist in any frontend/src or backend UI strings.
"""

import os
import re

EMOJI_PATTERN = re.compile(
    "["
    "\U0001F600-\U0001F64F"
    "\U0001F300-\U0001F5FF"
    "\U0001F680-\U0001F6FF"
    "\U0001F1E0-\U0001F1FF"
    "\U00002600-\U000026FF"
    "\U00002700-\U000027BF"
    "]+",
    flags=re.UNICODE,
)


def test_zero_emojis_in_codebase():
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    frontend_src = os.path.join(base_dir, "frontend", "src")
    backend_apps = os.path.join(base_dir, "backend", "apps")

    offending_files = []

    for target_dir in [frontend_src, backend_apps]:
        if not os.path.exists(target_dir):
            continue
        for root, _, files in os.walk(target_dir):
            for file in files:
                if file.endswith((".tsx", ".ts", ".jsx", ".js", ".py")):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, "r", encoding="utf-8") as f:
                            content = f.read()
                            matches = EMOJI_PATTERN.findall(content)
                            if matches:
                                offending_files.append((file, matches[:3]))
                    except Exception:
                        pass

    assert len(offending_files) == 0, f"Found emojis in UI files: {offending_files}"

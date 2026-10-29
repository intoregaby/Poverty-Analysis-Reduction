"""Small file helpers shared by the engine, the sources cache and the priority board."""

from __future__ import annotations

import os
import time
from pathlib import Path


def replace_file(temporary: Path, path: Path, attempts: int = 40, pause: float = 0.15, sleep=time.sleep) -> None:
    """On Windows, renaming over a file that another program has open for a moment (the app server, an antivirus scan,
    the search indexer) fails with "access denied". Try again briefly before giving up."""
    for attempt in range(attempts):
        try:
            os.replace(temporary, path)
            return
        except PermissionError:
            if attempt == attempts - 1:
                Path(temporary).unlink(missing_ok=True)
                raise
            sleep(pause)

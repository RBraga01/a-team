import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from process_utils import pid_is_running


def test_current_process_is_running():
    assert pid_is_running(os.getpid())


def test_nonexistent_process_is_not_running():
    assert not pid_is_running(2_147_483_647)

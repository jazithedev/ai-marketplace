import json
import os
import subprocess
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from guard_rm import find_violation  # noqa: E402

ROOT = "/work/project"
SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "guard_rm.py")


class FindViolationTest(unittest.TestCase):
    def test_blocks_targets_outside_the_project(self):
        cases = {
            "rm -rf /mnt/c/mnt": "/mnt/c/mnt",
            "go build && rm -rf /mnt/c/code": "/mnt/c/code",
            "rm -rf ~": "~",
            "rm -rf ../other": "../other",
            "rm -rf .": ".",
            "rm -rf $HOME/x": "$HOME/x",
            "echo hi;rm -fr /tmp/x": "/tmp/x",
            "sudo rm -rf /etc": "/etc",
            "find . | xargs rm -rf /var": "/var",
            "rm --recursive /opt": "/opt",
            "/bin/rm -Rf /srv": "/srv",
            "cd / && rm -rf etc": "etc",
            "rm -rf build /etc": "/etc",
        }
        for command, expected in cases.items():
            with self.subTest(command=command):
                # Act
                target = find_violation(command, ROOT, ROOT)

                # Assert
                self.assertEqual(expected, target)

    def test_allows_safe_commands(self):
        commands = [
            "rm -rf var/cache",
            "rm -f ./build/out.txt",
            "rm file.txt",
            "rm /etc/hosts",
            'rm -rf "src/My Dir"',
            "git rm -r --cached /etc",
            "ls -la /",
            "echo rm -rf /",
            "cd src && rm -rf generated",
            "rm -rf -- tmp",
        ]
        for command in commands:
            with self.subTest(command=command):
                # Act
                target = find_violation(command, ROOT, ROOT)

                # Assert
                self.assertIsNone(target)


class HookProcessTest(unittest.TestCase):
    def run_hook(self, command):
        payload = json.dumps({"cwd": ROOT, "tool_input": {"command": command}})
        env = {k: v for k, v in os.environ.items() if k != "CLAUDE_PROJECT_DIR"}
        return subprocess.run(
            [sys.executable, "-I", SCRIPT], input=payload, capture_output=True, text=True, env=env
        )

    def test_exit_code_2_with_reason_when_blocked(self):
        # Act
        result = self.run_hook("rm -rf /mnt/c/mnt")

        # Assert
        self.assertEqual(2, result.returncode)
        self.assertIn("/mnt/c/mnt", result.stderr)

    def test_exit_code_0_when_allowed(self):
        # Act
        result = self.run_hook("rm -rf var/cache")

        # Assert
        self.assertEqual(0, result.returncode)
        self.assertEqual("", result.stderr)


if __name__ == "__main__":
    unittest.main()

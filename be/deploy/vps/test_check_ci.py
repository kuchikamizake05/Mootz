import unittest
from check_ci import passed


class CIGateTest(unittest.TestCase):
    def setUp(self):
        self.sha = 'a' * 40
        self.run = dict(name='Backend checks', head_sha=self.sha, app={'slug': 'github-actions'},
                        status='completed', conclusion='success')

    def test_exact_success(self):
        self.assertTrue(passed([self.run], self.sha))

    def test_missing_failed_pending_and_other_commits_are_rejected(self):
        self.assertFalse(passed([], self.sha))
        for change in [dict(conclusion='failure'), dict(conclusion='skipped'), dict(status='in_progress'),
                       dict(head_sha='b' * 40), dict(app={'slug': 'other'}), dict(name='Other checks')]:
            with self.subTest(change=change):
                self.assertFalse(passed([{**self.run, **change}], self.sha))

    def test_old_success_cannot_override_a_failed_rerun(self):
        self.assertFalse(passed([{**self.run, 'id': 1}, {**self.run, 'id': 2, 'conclusion': 'failure'}], self.sha))

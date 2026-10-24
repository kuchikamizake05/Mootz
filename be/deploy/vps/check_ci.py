#!/usr/bin/env python3
"""Allow deployment only after this exact commit passed the backend workflow."""
import json
import re
import sys
import urllib.request


def passed(runs, sha):
    matching = [run for run in runs if run.get('name') == 'Backend checks'
        and run.get('head_sha') == sha
        and run.get('app', {}).get('slug') == 'github-actions'
    ]
    latest = max(matching, key=lambda run: run.get('id', 0), default={})
    return latest.get('status') == 'completed' and latest.get('conclusion') == 'success'


if __name__ == '__main__':
    sha = sys.argv[1]
    if not re.fullmatch(r'[0-9a-f]{40}', sha):
        sys.exit('Invalid deployment commit')
    url = f'https://api.github.com/repos/kuchikamizake05/Mootz/commits/{sha}/check-runs?per_page=100'
    request = urllib.request.Request(url, headers={'Accept': 'application/vnd.github+json', 'User-Agent': 'mootz-deploy'})
    with urllib.request.urlopen(request, timeout=20) as response:
        runs = json.load(response)['check_runs']
    if not passed(runs, sha):
        print(f'Waiting for Backend checks on {sha}')
        sys.exit(3)

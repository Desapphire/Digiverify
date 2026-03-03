import sys
from digiverify_cli import DigiverifyClient
import json

c = DigiverifyClient(verbose=False)
code, res = c.login('notakshay@proton.me', '3Us@x$E3cU6.Lz$')
print(f"Login Response: {code}")
if code == 200:
    code2, profile = c.get_profile()
    print(json.dumps(profile, indent=2))
else:
    print(res)

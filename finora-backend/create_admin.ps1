# create_admin.ps1 — Create the Django superuser non-interactively.
#
# Usage (run from finora-backend/):
#   $env:ADMIN_EMAIL="admin@finora.app"; $env:ADMIN_USERNAME="admin"; $env:ADMIN_PASSWORD="YourStr0ngP@ss!"; .\create_admin.ps1
#
# All three env vars are REQUIRED. The script will refuse to run without them.

if (-not $env:ADMIN_EMAIL -or -not $env:ADMIN_USERNAME -or -not $env:ADMIN_PASSWORD) {
    Write-Error "ERROR: ADMIN_EMAIL, ADMIN_USERNAME, and ADMIN_PASSWORD must be set as environment variables."
    exit 1
}

python create_admin.py

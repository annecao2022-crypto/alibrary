@echo off
echo Updating hosts file...

:: Remove old entry
powershell -Command "(Get-Content C:\Windows\System32\drivers\etc\hosts) | Where-Object { $_ -notmatch 'anneslibrary' } | Set-Content C:\Windows\System32\drivers\etc\hosts"

:: Add new entry
echo 127.0.0.1       alibrary >> C:\Windows\System32\drivers\etc\hosts

echo Done! Domain changed to http://alibrary
pause

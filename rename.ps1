Get-ChildItem -Path "C:\Users\ronak\Google\prompt virtual\prompt virtual" -Include *.html,*.css,*.js -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName
    if ($content -match '(?i)VenueFlow') {
        $content -replace '(?i)VenueFlow', 'Insight-X' | Set-Content $_.FullName
        Write-Host "Updated $($_.FullName)"
    }
}
